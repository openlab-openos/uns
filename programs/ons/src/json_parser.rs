use serde_json::{Value};
use std::fmt;

#[derive(Debug)]
pub struct ValidationError {
    pub path: String,
    pub message: String,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}: {}", self.path, self.message)
    }
}

impl std::error::Error for ValidationError {}

type Result<T> = std::result::Result<T, ValidationError>;

pub struct SchemaValidator;

fn get_type_name(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

impl SchemaValidator {
    pub fn validate(instance: &Value, schema: &Value) -> std::result::Result<(), ValidationError> {
        Self::validate_value(instance, schema, "$")
    }
    
    pub fn validate_schema(schema: &Value) -> std::result::Result<(), ValidationError> {
        if let Value::Object(obj) = schema {
            if !obj.contains_key("version") {
                return Err(ValidationError {
                    path: "$".to_string(),
                    message: "schema must contain 'version' field".to_string(),
                });
            }
            
            if let Some(version_value) = obj.get("version") {
                if !version_value.is_string() {
                    return Err(ValidationError {
                        path: "$.version".to_string(),
                        message: "version field must be a string".to_string(),
                    });
                }
                
                let version_str = version_value.as_str().unwrap();
                if !Self::is_valid_version_format(version_str) {
                    return Err(ValidationError {
                        path: "$.version".to_string(),
                        message: "version field must be in valid format like 1.0.0".to_string(),
                    });
                }
            }
            
            for (key, value) in obj {
                if key != "version" {
                    Self::validate_schema_value(value, &format!("$.{}", key))?;
                }
            }
            
            Ok(())
        } else {
            Err(ValidationError {
                path: "$".to_string(),
                message: "schema must be an object".to_string(),
            })
        }
    }
    
    fn is_valid_version_format(version: &str) -> bool {
        if version.is_empty() {
            return false;
        }
        
        let parts: Vec<&str> = version.split('.').collect();
        if parts.is_empty() {
            return false;
        }
        
        for part in parts {
            if part.is_empty() {
                return false;
            }
            
            if !part.chars().all(|c| c.is_ascii_digit()) {
                return false;
            }
            
            if part.len() > 1 && part.starts_with('0') {
                return false;
            }
        }
        
        true
    }
    
    fn validate_schema_value(schema_value: &Value, path: &str) -> Result<()> {
        match schema_value {
            Value::String(s) => {
                match s.as_str() {
                    "int" | "bool" | "{}" | "[]" | "float" => Ok(()),
                    "string" => Err(ValidationError {
                        path: path.to_string(),
                        message: "string type must specify maximum length like 'string(10)'".to_string(),
                    }),
                    s if s.starts_with("string(") && s.ends_with(")") => {
                        let len_str = &s[7..s.len() - 1];
                        len_str.parse::<usize>().map_err(|_| ValidationError {
                            path: path.to_string(),
                            message: format!("invalid string(N) format: '{}'", s),
                        })?;
                        Ok(())
                    }
                    _ => Err(ValidationError {
                        path: path.to_string(),
                        message: format!("invalid schema type: '{}'", s),
                    })
                }
            },
            Value::Array(arr) => {
                if arr.len() < 1 {
                    return Err(ValidationError {
                        path: path.to_string(),
                        message: "array schema must have one element".to_string(),
                    });
                }
                Self::validate_schema_value(&arr[0], path)
            },
            Value::Object(obj) => {
                for (key, value) in obj {
                    let nested_path = format!("{}.{}", path, key);
                    Self::validate_schema_value(value, &nested_path)?;
                }
                Ok(())
            },
            _ => Err(ValidationError {
                path: path.to_string(),
                message: format!("invalid schema value type: '{}'", get_type_name(schema_value)),
            })
        }
    }

    fn validate_value(instance: &Value, schema: &Value, path: &str) -> Result<()> {
        match schema {
            Value::String(s) => {
                Self::validate_primitive(instance, s, path)
            }
            Value::Array(schema_array) => {
                if schema_array.len() < 1 {
                    return Err(ValidationError {
                        path: path.to_string(),
                        message: "Array schema must have one element (the item type)".to_string(),
                    });
                }
                let item_schema = &schema_array[0];
                if let Value::Array(items) = instance {
                    for (i, item) in items.iter().enumerate() {
                        let item_path = format!("{}[{}]", path, i);
                        Self::validate_value(item, item_schema, &item_path)?;
                    }
                    Ok(())
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected array, got {}", get_type_name(instance)),
                    })
                }
            }
            Value::Object(schema_obj) => {
                if let Value::Object(obj) = instance {
                    if path == "$" {
                        if let (Some(schema_version), Some(instance_version)) = 
                            (schema_obj.get("version"), obj.get("version")) {
                            if schema_version != instance_version {
                                return Err(ValidationError {
                                    path: "$.version".to_string(),
                                    message: "data version must match schema version".to_string(),
                                });
                            }
                        }
                    }
                    
                    for (key, sub_schema) in schema_obj {                        
                        let field_path = format!("{}.{}", path, key);
                        if !obj.contains_key(key) {
                            return Err(ValidationError {
                                path: field_path,
                                message: "missing required field".to_string(),
                            });
                        }
                        if key == "version" {
                            continue;
                        }
                        Self::validate_value(&obj[key], sub_schema, &field_path)?;
                    }
                    Ok(())
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected object, got {}", get_type_name(instance)),
                    })
                }
            }
            _ => Err(ValidationError {
                path: path.to_string(),
                message: "Invalid schema: schema must be string, array, or object".to_string(),
            }),
        }
    }

    fn validate_primitive(instance: &Value, schema_str: &str, path: &str) -> Result<()> {
        match schema_str {
            "int" => {
                if let Value::Number(n) = instance {
                    if n.is_i64() || (n.is_u64() && n.as_u64().unwrap() <= i64::MAX as u64) {
                        Ok(())
                    } else {
                        Err(ValidationError {
                            path: path.to_string(),
                            message: "expected integer".to_string(),
                        })
                    }
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected int, got {}", get_type_name(instance)),
                    })
                }
            }
            "uint" => {
                if let Value::Number(n) = instance {
                    if n.is_u64() && n.as_u64().unwrap() <= i64::MAX as u64 {
                        Ok(())
                    } else {
                        Err(ValidationError {
                            path: path.to_string(),
                            message: "expected unsigned integer".to_string(),
                        })
                    }
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected unsigned int, got {}", get_type_name(instance)),
                    })
                }
            }
            "float" => {
                if let Value::Number(n) = instance {
                    if n.is_f64() || n.is_i64() || n.is_u64() {
                        Ok(())
                    } else {
                        Err(ValidationError {
                            path: path.to_string(),
                            message: "expected float".to_string(),
                        })
                    }
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected float, got {}", get_type_name(instance)),
                    })
                }
            }
            "bool" => {
                if instance.is_boolean() {
                    Ok(())
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected bool, got {}", get_type_name(instance)),
                    })
                }
            }
            "string" => {
                if instance.is_string() {
                    Ok(())
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected string, got {}", get_type_name(instance)),
                    })
                }
            }
            "{}" => {
                if instance.is_object() {
                    Ok(())
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected object, got {}", get_type_name(instance)),
                    })
                }
            }
            "[]" => {
                if instance.is_array() {
                    Ok(())
                } else {
                    Err(ValidationError {
                        path: path.to_string(),
                        message: format!("expected array, got {}", get_type_name(instance)),
                    })
                }
            }
            s if s.starts_with("string(") && s.ends_with(")") => {
                let len_str = &s[7..s.len() - 1];
                let parts: Vec<&str> = len_str.split(',').map(str::trim).collect();
                match parts.as_slice() {
                    [len_str] => {
                        println!("Validating string length: {}", len_str);
                        let need_len: usize = len_str.parse().map_err(|_| ValidationError {
                            path: path.to_string(),
                            message: format!("invalid string(N) format: '{}'", s),
                        })?;
                        if let Some(s) = instance.as_str() {
                            if s.len() != need_len {
                                Err(ValidationError {
                                    path: path.to_string(),
                                    message: format!("string length {}, needLen: {}", s.len(), need_len),
                                })
                            } else {
                                Ok(())
                            }
                        } else {
                            Err(ValidationError {
                                path: path.to_string(),
                                message: format!("expected string, got {}", get_type_name(instance)),
                            })
                        }
                    }
                    [min_str, max_str] => {
                        println!("Validating string length range: {} {}", min_str, max_str);
                        let min_len: usize = min_str.parse().map_err(|_| ValidationError {
                            path: path.to_string(),
                            message: format!("invalid string(N) format: '{}'", s),
                        })?;
                        let max_len: usize = max_str.parse().map_err(|_| ValidationError {
                            path: path.to_string(),
                            message: format!("invalid string(N) format: '{}'", s),
                        })?;
                        if let Some(s) = instance.as_str() {
                            if s.len() > max_len {
                                Err(ValidationError {
                                    path: path.to_string(),
                                    message: format!("string length: {}, maxLength: {}", s.len(), max_len),
                                })
                            } else if s.len() < min_len {
                                Err(ValidationError {
                                    path: path.to_string(),
                                    message: format!("string length: {}, minLength: {}", s.len(), min_len),
                                })
                            } else {
                                Ok(())
                            }
                        } else {
                            Err(ValidationError {
                                path: path.to_string(),
                                message: format!("expected string, got {}", get_type_name(instance)),
                            })
                        }
                    }
                    _ => {
                        return Err(ValidationError {
                            path: path.to_string(),
                            message: format!(
                                "invalid string(N) or string(min,max) format: expected one or two numbers, found {} in '{}'",
                                parts.len(),
                                s
                            ),
                        });
                    }
                }                
            }
            _ => Err(ValidationError {
                path: path.to_string(),
                message: format!("unknown or invalid schema type: '{}'", schema_str),
            }),
        }
    }
}
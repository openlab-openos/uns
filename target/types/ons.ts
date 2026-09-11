/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ons.json`.
 */
export type Ons = {
  "address": "unLUujZuXm7dJoZXwLanuVKBbeUHUDaJ85R9Z8FjLKR",
  "metadata": {
    "name": "ons",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "ecoBodyUpdate",
      "discriminator": [
        37,
        134,
        219,
        69,
        222,
        218,
        195,
        218
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "body",
          "type": "string"
        }
      ]
    },
    {
      "name": "ecoCreate",
      "discriminator": [
        223,
        190,
        174,
        92,
        105,
        87,
        2,
        202
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "ecoTpl",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "feeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "meta",
          "type": "string"
        },
        {
          "name": "body",
          "type": "string"
        },
        {
          "name": "years",
          "type": "u8"
        }
      ]
    },
    {
      "name": "ecoMetaUpdate",
      "discriminator": [
        79,
        211,
        208,
        156,
        125,
        5,
        41,
        20
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "ecoTpl",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "meta",
          "type": "string"
        }
      ]
    },
    {
      "name": "ecoOwnerRenew",
      "discriminator": [
        214,
        174,
        217,
        55,
        12,
        171,
        25,
        42
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "feeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "years",
          "type": "u8"
        }
      ]
    },
    {
      "name": "ecoOwnerTransfer",
      "discriminator": [
        41,
        116,
        159,
        250,
        220,
        111,
        208,
        177
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "newOwner"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "ecoRentAsk",
      "discriminator": [
        68,
        221,
        141,
        51,
        15,
        232,
        143,
        212
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "enabled",
          "type": "u8"
        },
        {
          "name": "rentPerDay",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ecoRentBid",
      "discriminator": [
        66,
        193,
        230,
        133,
        164,
        61,
        103,
        107
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "rentInfo",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "feeReceiver",
          "writable": true
        },
        {
          "name": "fromTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "toTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "mint",
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "AtokenhZ6AE34VMYRv1AqSv8q8QZJxxEaY1zKiXKwSWT"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "days",
          "type": "u32"
        }
      ]
    },
    {
      "name": "ecoRentInfoUpdate",
      "discriminator": [
        117,
        156,
        165,
        149,
        135,
        79,
        177,
        125
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "rentInfo",
          "writable": true
        },
        {
          "name": "updater",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "info",
          "type": "string"
        }
      ]
    },
    {
      "name": "ecoRentRenew",
      "discriminator": [
        137,
        153,
        3,
        143,
        13,
        120,
        84,
        93
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "feeReceiver",
          "writable": true
        },
        {
          "name": "fromTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "toTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "mint",
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "AtokenhZ6AE34VMYRv1AqSv8q8QZJxxEaY1zKiXKwSWT"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "days",
          "type": "u32"
        }
      ]
    },
    {
      "name": "ecoRentTransfer",
      "discriminator": [
        104,
        4,
        103,
        139,
        131,
        239,
        165,
        85
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "rentInfo",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "newOwner"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "ecoSaleAsk",
      "discriminator": [
        229,
        184,
        80,
        119,
        5,
        53,
        161,
        255
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "enabled",
          "type": "u8"
        },
        {
          "name": "sellPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ecoSaleBid",
      "discriminator": [
        117,
        238,
        227,
        184,
        27,
        44,
        93,
        186
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "feeReceiver",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "AtokenhZ6AE34VMYRv1AqSv8q8QZJxxEaY1zKiXKwSWT"
        },
        {
          "name": "fromTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "toTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "mint",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "ecotplInitialize",
      "discriminator": [
        195,
        136,
        215,
        178,
        250,
        212,
        16,
        133
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "configJson",
          "type": "string"
        }
      ]
    },
    {
      "name": "ecotplUpdate",
      "discriminator": [
        8,
        86,
        206,
        135,
        237,
        125,
        106,
        52
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  99,
                  111,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "configJson",
          "type": "string"
        }
      ]
    },
    {
      "name": "entityBodyUpdate",
      "discriminator": [
        96,
        211,
        249,
        100,
        49,
        26,
        121,
        246
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "body",
          "type": "string"
        }
      ]
    },
    {
      "name": "entityCreate",
      "discriminator": [
        78,
        75,
        36,
        119,
        176,
        7,
        225,
        167
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "entityTpl",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  105,
                  116,
                  121,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "parentFeeReceiver",
          "writable": true
        },
        {
          "name": "protocolFeeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "meta",
          "type": "string"
        },
        {
          "name": "body",
          "type": "string"
        },
        {
          "name": "years",
          "type": "u8"
        }
      ]
    },
    {
      "name": "entityMetaUpdate",
      "discriminator": [
        210,
        210,
        102,
        243,
        139,
        111,
        14,
        20
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "entityTpl",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  105,
                  116,
                  121,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "meta",
          "type": "string"
        }
      ]
    },
    {
      "name": "entityOwnerRenew",
      "discriminator": [
        209,
        196,
        203,
        79,
        26,
        200,
        28,
        217
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "parentFeeReceiver",
          "writable": true
        },
        {
          "name": "protocolFeeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "years",
          "type": "u8"
        }
      ]
    },
    {
      "name": "entityOwnerTransfer",
      "discriminator": [
        66,
        65,
        111,
        156,
        188,
        77,
        85,
        243
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "newOwner"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "entityRentAsk",
      "discriminator": [
        85,
        169,
        15,
        31,
        105,
        138,
        244,
        168
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "enabled",
          "type": "u8"
        },
        {
          "name": "rentPerDay",
          "type": "u64"
        }
      ]
    },
    {
      "name": "entityRentBid",
      "discriminator": [
        56,
        65,
        149,
        17,
        45,
        45,
        115,
        22
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "rentInfo",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "feeReceiver",
          "writable": true
        },
        {
          "name": "protocolFeeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "days",
          "type": "u32"
        }
      ]
    },
    {
      "name": "entityRentInfoUpdate",
      "discriminator": [
        153,
        179,
        170,
        107,
        123,
        126,
        40,
        231
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "rentInfo",
          "writable": true
        },
        {
          "name": "updater",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "info",
          "type": "string"
        }
      ]
    },
    {
      "name": "entityRentRenew",
      "discriminator": [
        163,
        48,
        29,
        107,
        115,
        92,
        45,
        13
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "protocolFeeReceiver",
          "writable": true
        },
        {
          "name": "feeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "days",
          "type": "u32"
        }
      ]
    },
    {
      "name": "entityRentTransfer",
      "discriminator": [
        212,
        245,
        10,
        195,
        110,
        180,
        63,
        34
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "rentInfo",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "newOwner"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "entitySaleAsk",
      "discriminator": [
        147,
        9,
        30,
        119,
        59,
        82,
        179,
        27
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "enabled",
          "type": "u8"
        },
        {
          "name": "rentPerDay",
          "type": "u64"
        }
      ]
    },
    {
      "name": "entitySaleBid",
      "discriminator": [
        148,
        55,
        30,
        106,
        223,
        120,
        77,
        59
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "protocolFeeReceiver",
          "writable": true
        },
        {
          "name": "feeReceiver",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "entitytplInitialize",
      "discriminator": [
        251,
        163,
        186,
        140,
        177,
        223,
        246,
        199
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  105,
                  116,
                  121,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "configJson",
          "type": "string"
        }
      ]
    },
    {
      "name": "entitytplUpdate",
      "discriminator": [
        192,
        23,
        21,
        68,
        216,
        50,
        192,
        171
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  105,
                  116,
                  121,
                  95,
                  116,
                  112,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "configJson",
          "type": "string"
        }
      ]
    },
    {
      "name": "nameClose",
      "discriminator": [
        191,
        150,
        52,
        11,
        95,
        74,
        123,
        17
      ],
      "accounts": [
        {
          "name": "header",
          "writable": true
        },
        {
          "name": "meta",
          "writable": true
        },
        {
          "name": "body",
          "writable": true
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "treasuryInitialize",
      "discriminator": [
        41,
        8,
        79,
        183,
        19,
        251,
        162,
        116
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "configJson",
          "type": "string"
        }
      ]
    },
    {
      "name": "treasuryUpdate",
      "discriminator": [
        36,
        35,
        172,
        252,
        1,
        147,
        230,
        241
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "configJson",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "authJsonConfig",
      "discriminator": [
        149,
        123,
        37,
        90,
        16,
        82,
        10,
        19
      ]
    },
    {
      "name": "headerInfo",
      "discriminator": [
        75,
        60,
        2,
        82,
        185,
        10,
        111,
        222
      ]
    }
  ],
  "events": [
    {
      "name": "askEvent",
      "discriminator": [
        100,
        180,
        197,
        92,
        59,
        29,
        114,
        4
      ]
    },
    {
      "name": "bidEvent",
      "discriminator": [
        244,
        161,
        131,
        196,
        237,
        176,
        164,
        118
      ]
    },
    {
      "name": "configUpdateEvent",
      "discriminator": [
        158,
        144,
        170,
        167,
        15,
        184,
        45,
        12
      ]
    },
    {
      "name": "nameCreateEvent",
      "discriminator": [
        19,
        15,
        98,
        1,
        9,
        159,
        6,
        110
      ]
    },
    {
      "name": "renewEvent",
      "discriminator": [
        205,
        48,
        207,
        224,
        57,
        229,
        82,
        180
      ]
    },
    {
      "name": "transferEvent",
      "discriminator": [
        100,
        10,
        46,
        113,
        8,
        28,
        179,
        125
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooLong",
      "msg": "Name too long"
    },
    {
      "code": 6001,
      "name": "nameEmpty",
      "msg": "Name empty"
    },
    {
      "code": 6002,
      "name": "jsonTooLong",
      "msg": "Json too long"
    },
    {
      "code": 6003,
      "name": "ownerMismatch",
      "msg": "Owner mismatch"
    },
    {
      "code": 6004,
      "name": "renterMismatch",
      "msg": "Renter mismatch"
    },
    {
      "code": 6005,
      "name": "alreadyLeased",
      "msg": "Already leased"
    },
    {
      "code": 6006,
      "name": "rentTooLong",
      "msg": "Rent too long"
    },
    {
      "code": 6007,
      "name": "saleDisabled",
      "msg": "Sale disabled"
    },
    {
      "code": 6008,
      "name": "rentDisabled",
      "msg": "Rent disabled"
    },
    {
      "code": 6009,
      "name": "yearsTooSmall",
      "msg": "Years too small"
    },
    {
      "code": 6010,
      "name": "daysTooSmall",
      "msg": "Days too small"
    },
    {
      "code": 6011,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6012,
      "name": "invalidTreasury",
      "msg": "Invalid treasury"
    },
    {
      "code": 6013,
      "name": "invalidTreasuryConfig",
      "msg": "Invalid treasury configuration"
    },
    {
      "code": 6014,
      "name": "invalidMetaConfig",
      "msg": "Invalid meta Configuration"
    },
    {
      "code": 6015,
      "name": "invalidJsonFormat",
      "msg": "Invalid json format"
    },
    {
      "code": 6016,
      "name": "mintMismatch",
      "msg": "Mint mismatch between accounts"
    },
    {
      "code": 6017,
      "name": "mintMismatchPayToken",
      "msg": "Mint mismatch pay token"
    },
    {
      "code": 6018,
      "name": "tokenAccountOwnerMismatch",
      "msg": "Token account owner mismatch"
    },
    {
      "code": 6019,
      "name": "feeReceiverMismatch",
      "msg": "FeeReceiver mismatch"
    },
    {
      "code": 6020,
      "name": "nameCloserMismatch",
      "msg": "Name closer mismatch"
    },
    {
      "code": 6021,
      "name": "invalidCharacter",
      "msg": "Invalid character"
    },
    {
      "code": 6022,
      "name": "nameInUse",
      "msg": "Name in use"
    },
    {
      "code": 6023,
      "name": "nameExpired",
      "msg": "Name expired"
    },
    {
      "code": 6024,
      "name": "nameNotExpired",
      "msg": "Name not expired"
    },
    {
      "code": 6025,
      "name": "rentExpired",
      "msg": "Rent expired"
    },
    {
      "code": 6026,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6027,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6028,
      "name": "invalidTokenProgram",
      "msg": "Invalid token program"
    },
    {
      "code": 6029,
      "name": "missingEcoSeparator",
      "msg": "Missing eco separator"
    },
    {
      "code": 6030,
      "name": "invalidEntityName",
      "msg": "Invalid entity name"
    },
    {
      "code": 6031,
      "name": "maxEntityLevelIsFour",
      "msg": "Max entity level is 4"
    },
    {
      "code": 6032,
      "name": "configPdaNotFound",
      "msg": "Config pda not found"
    },
    {
      "code": 6033,
      "name": "deserializationError",
      "msg": "Deserialization error"
    },
    {
      "code": 6034,
      "name": "invalidFeeReceiver",
      "msg": "Invalid fee receiver"
    },
    {
      "code": 6035,
      "name": "invalidMetaPda",
      "msg": "Invalid meta pda"
    },
    {
      "code": 6036,
      "name": "parentNotCreated",
      "msg": "Parent not created"
    },
    {
      "code": 6037,
      "name": "missingParentMetaAccount",
      "msg": "Missing parent meta account"
    },
    {
      "code": 6038,
      "name": "invalidReceiverPda",
      "msg": "Invalid receiver pda"
    },
    {
      "code": 6039,
      "name": "invalidFees",
      "msg": "Invalid fees"
    },
    {
      "code": 6040,
      "name": "invalidEnabled",
      "msg": "Invalid enabled value"
    }
  ],
  "types": [
    {
      "name": "askEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "kind",
            "type": "string"
          },
          {
            "name": "enabled",
            "type": "u8"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "operator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "authJsonConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "configJson",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "bidEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "kind",
            "type": "string"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "start",
            "type": "i64"
          },
          {
            "name": "end",
            "type": "i64"
          },
          {
            "name": "fees",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "configUpdateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "kind",
            "type": "string"
          },
          {
            "name": "newValue",
            "type": "string"
          },
          {
            "name": "operator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "headerInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "ownerStart",
            "type": "i64"
          },
          {
            "name": "ownerEnd",
            "type": "i64"
          },
          {
            "name": "sellEnabled",
            "type": "u8"
          },
          {
            "name": "sellPrice",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "userStart",
            "type": "i64"
          },
          {
            "name": "userEnd",
            "type": "i64"
          },
          {
            "name": "rentEnabled",
            "type": "u8"
          },
          {
            "name": "rentPerDay",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "nameCreateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "kind",
            "type": "string"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "start",
            "type": "i64"
          },
          {
            "name": "end",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "renewEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "kind",
            "type": "string"
          },
          {
            "name": "start",
            "type": "i64"
          },
          {
            "name": "end",
            "type": "i64"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "duration",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "transferEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "kind",
            "type": "string"
          },
          {
            "name": "newOwner",
            "type": "pubkey"
          },
          {
            "name": "operator",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};

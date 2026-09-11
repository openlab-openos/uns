import * as anchor from "@coral-xyz/anchor";
import { Program,AnchorError} from "@coral-xyz/anchor";
import { Ons } from "../target/types/ons";
import { PublicKey, Keypair, ComputeBudgetProgram, Transaction} from '@solana/web3.js';
import { expect, assert} from 'chai';
import { sha256 } from "@noble/hashes/sha256";
import {
    getAccount,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountIdempotent,
    TOKEN_2022_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,ASSOCIATED_TOKEN_PROGRAM_ID
  } from 'open-token-web3';
import { min } from "bn.js";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

function getHashPrefix(input: string): Uint8Array {
    return sha256(new TextEncoder().encode(input)).slice(0, 16);
}

function extractParentNames(full_name: string): string[] {
    try {
      const parts = full_name.split('://');
      if(parts.length != 2)
        throw new Error("invalid entity name.");
      const protocol = parts[0];
      
      const nameparts = parts[1].split('.');
      const parentNames: string[] = [];
      parentNames.push(`${protocol}`);      
      for (let i = nameparts.length-1; i >= 0; i--) {
        const parentHost = nameparts.slice(i).join('.');
        parentNames.push(`${protocol}://${parentHost}`);
      }
      //parents.push(`${protocol}//${nameparts[0]}`);
      
      if(parentNames.length > 5)
        throw new Error("too much level.");

      return parentNames;
    } catch (urlError) {
        console.log("parse failure.", urlError);
        return [];        
    }
}

describe("ons", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.Ons as Program<Ons>;
    const provider = anchor.AnchorProvider.env();
    const wallet = provider.wallet as anchor.Wallet;
    //console.log(wallet.publicKey.toString());

    it('entity create', async () => {
        console.log("---- create entity ----");
        const payer = wallet.payer;
        console.log("payer:", payer.publicKey.toString());
        //const parent = anchor.web3.Keypair.generate(); // Assuming this is a PDA or already existing domain
        //const full_name = "very.longloonglonglonglongglonglonglonglonglonglonglongl2onglonglonglonglo.subdomain.example.ons";        
        //const full_name = "openverse";
        const name_arr = ["open://api.devnet.openverse.net","open://devnet.openverse.net","open://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        //const full_name = "open://test3";

        const meta_json = `{
            "version": "1.0.0",
            "cycle_fees": 1000000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
            "title":"",
            "icon":"",
            "uri":"",  
            "description": ""
        }`;
        //const meta_json = '{"version":"1.0.0","basis_points_sell":200,"basis_points_rent":100,"fee_shortname":2000000,"fee_longname":1000000,"fee_receiver":"5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE","title":"","icon":"","uri":"","description":""}';
        // const raw_json = {
        //     "version": "1.0.0",
        //     "basis_points_sell": 200,
        //     "basis_points_rent": 100,
        //     "fee_shortname": 2000000,
        //     "fee_longname": 1000000,
        //     "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
        //     "title":"",
        //     "icon":"",
        //     "uri":"",  
        //     "description": ""
        // };
        // const meta_json = JSON.stringify(raw_json);
        const body_json = "body......";
        const years = 1;
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());
        try{
            let oldheaderConfig = await program.account.headerInfo.fetch(headerPDA);
            console.log("ons registed..return");
            return;
        }catch(error){
        }

        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());

        const [bodyPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("body"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", bodyPDA.toString());        
    
        const allParentNames = extractParentNames(full_name);
        console.log(allParentNames);
        let allNamesLength = allParentNames.length;
        let parent_name = allParentNames[allNamesLength - 2];
        let eco_name = allParentNames[0];
        console.log(`parent_name: ${parent_name} eco_name:${eco_name}`);       

        let fromTokenAccount = null;//new PublicKey("3pv2qgomqCMpsRffobkzdtbdL9oNvNVR8vXTuoEwvjf7");
        let mint = null;
        let remainAccounts = [];
        
        let accounts: any = {
            header: headerPDA,
            meta: metaPDA,
            body: bodyPDA,            
            systemProgram: anchor.web3.SystemProgram.programId,            
            operator: payer.publicKey,
        };

        let [parentMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(parent_name))],
            program.programId
        );            
        const parentAccountInfo = await provider.connection.getAccountInfo(parentMetaPDA);    
        if (!parentAccountInfo) {
            console.log(`Meta PDA not found for: ${parent_name} (${parentMetaPDA.toBase58()})`);
            return; 
        }
        //accounts[`parentMeta`] = parentMetaPDA; 
        let parentMetaConfig = await program.account.authJsonConfig.fetch(parentMetaPDA);
        console.log("parentMetaConfig:", parentMetaConfig);
        const parentJsonConfig = JSON.parse(parentMetaConfig.configJson);   
        let parentReceiver = parentJsonConfig.fee_receiver;         
        accounts[`parentFeeReceiver`] = new anchor.web3.PublicKey(parentReceiver);

        let [ecoMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(eco_name))],
            program.programId
        );            
        const ecoAccountInfo = await provider.connection.getAccountInfo(ecoMetaPDA);    
        if (!ecoAccountInfo) {
            console.log(`Meta PDA not found for: ${eco_name} (${ecoMetaPDA.toBase58()})`);
            return; 
        }
        let ecoConfig = await program.account.authJsonConfig.fetch(ecoMetaPDA);
        const ecoJsonConfig = JSON.parse(ecoConfig.configJson);   
        let payTokenStr = ecoJsonConfig.pay_token;
        console.log("payTokenStr:", payTokenStr);

        //accounts[`ecoMeta`] = ecoMetaPDA;  
        remainAccounts.push({
            pubkey: ecoMetaPDA,
            isWritable: false,
            isSigner: false,
        });
        remainAccounts.push({
            pubkey: parentMetaPDA,
            isWritable: false,
            isSigner: false,
        });
  
        const [entityTplPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("entity_tpl")],
            program.programId
        );
        accounts[`entityTpl`] = entityTplPDA;
        const [protocolConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got protocol config PDA:", protocolConfigPDA.toString());
        let protocolConfig = await program.account.authJsonConfig.fetch(protocolConfigPDA);
        const protocolJsonConfig = JSON.parse(protocolConfig.configJson);   
        let protocolReceiver = protocolJsonConfig.fee_receiver;         
        accounts[`protocolConfig`] = protocolConfigPDA;
        accounts[`protocolFeeReceiver`] = new anchor.web3.PublicKey(protocolReceiver);

        const fromOwner = wallet.payer;
        if(payTokenStr != "11111111111111111111111111111111111111111111"){
            mint = new anchor.web3.PublicKey(payTokenStr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );
            const toOwner = new PublicKey(parentReceiver);  
            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
                );
            let toTokenAccount = toTokenAccountAta.address;
            //accounts[`toAta${i}`] = toTokenAccount;
            remainAccounts.push({
                pubkey: toTokenAccount,
                isWritable: true,
                isSigner: false,
            });//2
        }

        console.log(accounts);

        //from
        if(fromTokenAccount != null){
            remainAccounts.push({
                pubkey: fromTokenAccount,
                isWritable: true,
                isSigner: false,
            });//3
        }
        //authority
        remainAccounts.push({
            pubkey: payer.publicKey,
            isWritable: false,
            isSigner: false,
        });//4
        //mint
        if(mint != null){
            remainAccounts.push({
                pubkey: mint,
                isWritable: false,
                isSigner: false,
            }); 
        }//5
        //tokenProgram
        remainAccounts.push({
            pubkey: TOKEN_2022_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
        });//6
        console.log("remainAccounts:", remainAccounts);
        try{
            const instruction = await program.methods.entityCreate(full_name, meta_json, body_json, years)
                .accounts(accounts)
                .signers([payer])
                .remainingAccounts(remainAccounts)
                .instruction();
            const transaction = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                instruction
                );
                
            const tx = await provider.sendAndConfirm(transaction, [payer], {
                commitment: "confirmed",
            });
                
            console.log("🎉 Transaction successful:", tx);
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        }    
        console.log("begin to verify header account..");
        let headerAccount = await program.account.headerInfo.fetch(headerPDA);        
        console.log("headerAccount:", headerAccount)

        //expect(domainAccount.name).to.equal(full_name);

        console.log("begin to verify meta account..");
        let metaAccount = await program.account.authJsonConfig.fetch(metaPDA);    
        console.log("meta config:", metaAccount);

        let bodyAccount = await program.account.authJsonConfig.fetch(bodyPDA);
        console.log("body config:", bodyAccount);
    });

    it('entity close', async () => {
        console.log("---- ecoclose ----");
        const payer = wallet.payer;
        //const parent = anchor.web3.Keypair.generate(); // Assuming this is a PDA or already existing domain
        //const full_name = "very.longloonglonglonglongglonglonglonglonglonglonglongl2onglonglonglonglo.subdomain.example.ons";        
        //const full_name = "openverse";
        //pay_token=Cmdnkd1MJBfKuBjp3j33BqeesZCYrnJ4mXnk19Uhs3z2
        //pay_token=11111111111111111111111111111111111111111111
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","ons://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];        

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());

        const [bodyPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("body"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", metaPDA.toString());

        const [treasuryConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got treasury config PDA:", treasuryConfigPDA.toString());
        let treasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
        console.log("treasury:", treasuryConfig);
        const jsonConfig = JSON.parse(treasuryConfig.configJson);
        const feeReceiver = jsonConfig.fee_receiver;
        console.log("feeReceiver:", feeReceiver);

        // Register Domain
        try{
        await program.methods.nameClose(full_name)
            .accounts({
                operator: payer.publicKey,
                header: headerPDA,
                meta: metaPDA,
                body: bodyPDA,
                treasury: treasuryConfigPDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([payer])
            .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        }    
        console.log("begin to verify header account..");
        let headerAccount = await program.account.headerInfo.fetch(headerPDA);        
        console.log("headerAccount:", headerAccount)

        //expect(domainAccount.name).to.equal(full_name);

        console.log("begin to verify meta account..");
        let metaAccount = await program.account.authJsonConfig.fetch(metaPDA);    
        console.log("meta config:", metaAccount);

        let bodyAccount = await program.account.authJsonConfig.fetch(bodyPDA);
        console.log("body config:", bodyAccount);
    });

    it('entity owner renew ', async () => {
        console.log("---renew entity---");
        //const payer = Keypair.generate();
        const payer = wallet.payer;
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const years = 2;
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );

        let oldHeaderAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("old HeaderAccount:", oldHeaderAccount)
        const expire_timestamp = oldHeaderAccount.ownerEnd;
        const expire_date = new Date(expire_timestamp * 1000);
        console.log("old expire_date:",expire_date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));

        const allParentNames = extractParentNames(full_name);
        console.log(allParentNames);
        let allNamesLength = allParentNames.length;
        let parent_name = allParentNames[allNamesLength - 2];
        let eco_name = allParentNames[0];
        console.log(`parent_name: ${parent_name} eco_name:${eco_name}`);

        let fromTokenAccount = null;//new PublicKey("3pv2qgomqCMpsRffobkzdtbdL9oNvNVR8vXTuoEwvjf7");
        let mint = null;
        let remainAccounts = [];

        let accounts: any = {
            header: headerPDA,   
            systemProgram: anchor.web3.SystemProgram.programId,            
            operator: payer.publicKey,
        };

        const fromOwner = wallet.payer;

        let [parentMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(parent_name))],
            program.programId
        );            
        const parentAccountInfo = await provider.connection.getAccountInfo(parentMetaPDA);    
        if (!parentAccountInfo) {
            console.log(`Meta PDA not found for: ${parent_name} (${parentMetaPDA.toBase58()})`);
            return; 
        }
        //accounts[`parentMeta`] = parentMetaPDA; 
        let parentMetaConfig = await program.account.authJsonConfig.fetch(parentMetaPDA);
        console.log("parentMetaConfig:", parentMetaConfig);
        const parentJsonConfig = JSON.parse(parentMetaConfig.configJson);   
        let parentReceiver = parentJsonConfig.fee_receiver;         
        accounts[`parentFeeReceiver`] = new anchor.web3.PublicKey(parentReceiver);

        let [ecoMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(eco_name))],
            program.programId
        );            
        const ecoAccountInfo = await provider.connection.getAccountInfo(ecoMetaPDA);    
        if (!ecoAccountInfo) {
            console.log(`Meta PDA not found for: ${eco_name} (${ecoMetaPDA.toBase58()})`);
            return; 
        }
        let ecoConfig = await program.account.authJsonConfig.fetch(ecoMetaPDA);
        const ecoJsonConfig = JSON.parse(ecoConfig.configJson);   
        let payTokenStr = ecoJsonConfig.pay_token;
        console.log("payTokenStr:", payTokenStr);

        //accounts[`ecoMeta`] = ecoMetaPDA;  
        remainAccounts.push({
            pubkey: ecoMetaPDA,
            isWritable: false,
            isSigner: false,
        });
        remainAccounts.push({
            pubkey: parentMetaPDA,
            isWritable: false,
            isSigner: false,
        });

        const [protocolConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got protocol config PDA:", protocolConfigPDA.toString());
        let protocolConfig = await program.account.authJsonConfig.fetch(protocolConfigPDA);
        const protocolJsonConfig = JSON.parse(protocolConfig.configJson);   
        let protocolReceiver = protocolJsonConfig.fee_receiver;         
        accounts[`protocolConfig`] = protocolConfigPDA;
        accounts[`protocolFeeReceiver`] = new anchor.web3.PublicKey(protocolReceiver);
        
        if(payTokenStr != "11111111111111111111111111111111111111111111"){
            mint = new anchor.web3.PublicKey(payTokenStr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );

            const toOwner = new PublicKey(parentReceiver);  
            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
                );
            let toTokenAccount = toTokenAccountAta.address;
            //accounts[`toAta${i}`] = toTokenAccount;
            remainAccounts.push({
                pubkey: toTokenAccount,
                isWritable: true,
                isSigner: false,
            });//2
        }

        console.log(accounts);

        //from
        if(fromTokenAccount != null){
            remainAccounts.push({
                pubkey: fromTokenAccount,
                isWritable: true,
                isSigner: false,
            });
        }//3
        //authority
        remainAccounts.push({
            pubkey: payer.publicKey,
            isWritable: false,
            isSigner: false,
        });//4
        //mint
        if(mint != null){
            remainAccounts.push({
                pubkey: mint,
                isWritable: false,
                isSigner: false,
            }); 
        }//5
        //tokenProgram
        remainAccounts.push({
            pubkey: TOKEN_2022_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
        });//6
        console.log(remainAccounts);

        // Renew Domain
        try{
            const instruction = await program.methods.entityOwnerRenew(full_name, years)
                .accounts(accounts)
                .signers([payer])
                .remainingAccounts(remainAccounts)
                .instruction();
            const transaction = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                instruction
                );
                
            const tx = await provider.sendAndConfirm(transaction, [payer], {
                commitment: "confirmed",
            });
                
            console.log("🎉 Transaction successful:", tx);
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        }    
        console.log("begin to verify domain account..");   
        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        //console.log("domainAccount.expires_at:", domainAccount.expiresAt);
        const new_expire_timestamp = headerAccount.ownerEnd;
        const new_expire_date = new Date(new_expire_timestamp * 1000);
        console.log("new expire_date:",new_expire_date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
        //expect(domainAccount.expirest).to.be.greaterThan(domainAccount.created_at + 365 * 24 * 60 * 60); // Ensure expiry is extended by at least one year
    });

    it('entity meta update', async () => {
        console.log("---entitymeta update native----");
        const payer = wallet.payer;
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","ons://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());
        let oldConfigAccount = await program.account.authJsonConfig.fetch(metaPDA);    
        console.log("old json config:", oldConfigAccount);

        const meta_json = `{
            "version": "1.0.0",
            "basis_points_sell": 200,
            "basis_points_rent": 100,
            "fee_shortname": 2000000,
            "fee_longname": 1000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
            "title":"2",
            "icon":"",
            "uri":"",  
            "description": "2"
        }`;
        try{
            await program.methods.entityMetaUpdate(full_name, meta_json)
                .accounts({
                    header: headerPDA,
                    meta: metaPDA,
                    updater: payer.publicKey,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        }    
        let newConfigAccount = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("new meta:", newConfigAccount);
    });

    it('entity body update', async () => {
        console.log("---Update body entity----");
        const payer = wallet.payer;
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","ons://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        const [bodyPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("body"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", bodyPDA.toString());
        let oldConfigAccount = await program.account.authJsonConfig.fetch(bodyPDA);    
        console.log("old json config:", oldConfigAccount);

        const body_json = `body2....`;
        try{
            await program.methods.entityBodyUpdate(full_name, body_json)
                .accounts({
                    header: headerPDA,
                    body: bodyPDA,
                    updater: payer.publicKey,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        }    
        let newConfigAccount = await program.account.authJsonConfig.fetch(bodyPDA);
        console.log("new meta:", newConfigAccount);
    });

    it('Update meta entity must be failure', async () => {
        console.log("---Update meta entity must be failure----");
        //const payer = wallet.payer;
        const updater = anchor.web3.Keypair.generate(); 
        const airdropTx = await program.provider.connection.requestAirdrop(
            updater.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 10 // 1 SOL
        );
        await program.provider.connection.confirmTransaction(airdropTx);
        console.log("updater address:", updater.publicKey.toString());

        const full_name = "ons";
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        const [bodyPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("body"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", bodyPDA.toString());
        let oldConfigAccount = await program.account.authJsonConfig.fetch(bodyPDA);    
        console.log("old body:", oldConfigAccount);

        const body_json = '{"new_resolver":"updated.example.com"}';
        await program.methods.entityBodyUpdate(full_name, body_json)
            .accounts({
                header: headerPDA,
                body: bodyPDA,
                updater: updater.publicKey,
            })
            .signers([updater])
            .rpc();

        let newConfigAccount = await program.account.authJsonConfig.fetch(bodyPDA);
        console.log("new meta:", newConfigAccount);
    });

    it('entity sale ask', async () => {
        console.log("--- entitysale ask----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());        
        const sell_price = new anchor.BN(1_000_000);

        try{
            await program.methods.entitySaleAsk(full_name, 1, sell_price)
                .accounts({
                    header: headerPDA,
                    operator: payer.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
    }); 

    it('entity sale bid', async () => {
        console.log("--- entitysale bid----");
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const payer = wallet.payer;        

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());
        const [bodyPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("body"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", bodyPDA.toString());
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());
        let metaConfig = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("metaconfig:", metaConfig);
        const jsonConfig = JSON.parse(metaConfig.configJson);
        const feeReceiver = jsonConfig.fee_receiver; 

        const allParentNames = extractParentNames(full_name);
        console.log(allParentNames);
        let allNamesLength = allParentNames.length;
        let parent_name = allParentNames[allNamesLength - 2];
        let eco_name = allParentNames[0];
        console.log(`parent_name: ${parent_name} eco_name:${eco_name}`);

        let [ecoMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(eco_name))],
            program.programId
        );            
        const ecoAccountInfo = await provider.connection.getAccountInfo(ecoMetaPDA);    
        if (!ecoAccountInfo) {
            console.log(`Meta PDA not found for: ${eco_name} (${ecoMetaPDA.toBase58()})`);
            return; 
        }
        let ecoConfig = await program.account.authJsonConfig.fetch(ecoMetaPDA);
        const ecoJsonConfig = JSON.parse(ecoConfig.configJson);   
        let payTokenStr = ecoJsonConfig.pay_token;

        let fromTokenAccount = null;//new PublicKey("3pv2qgomqCMpsRffobkzdtbdL9oNvNVR8vXTuoEwvjf7");
        let mint = null;
        let remainAccounts = [];

        let accounts: any = {
            header: headerPDA,
            meta: metaPDA,
            body: bodyPDA,            
            systemProgram: anchor.web3.SystemProgram.programId,            
            operator: payer.publicKey,
        };

        const [protocolConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got protocol config PDA:", protocolConfigPDA.toString());
        let protocolConfig = await program.account.authJsonConfig.fetch(protocolConfigPDA);
        const protocolJsonConfig = JSON.parse(protocolConfig.configJson);   
        let protocolReceiver = protocolJsonConfig.fee_receiver;         
        accounts[`protocolConfig`] = protocolConfigPDA;
        accounts[`protocolFeeReceiver`] = new anchor.web3.PublicKey(protocolReceiver);
        accounts[`feeReceiver`] = new anchor.web3.PublicKey(feeReceiver);

        remainAccounts.push({
            pubkey: ecoMetaPDA,
            isWritable: false,
            isSigner: false,
        });

        const fromOwner = wallet.payer;
        if(payTokenStr != "11111111111111111111111111111111111111111111"){
            mint = new anchor.web3.PublicKey(payTokenStr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );
        
            const toOwner = new PublicKey(feeReceiver);  
            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
                );
            let toTokenAccount = toTokenAccountAta.address;
            //accounts[`toAta${i}`] = toTokenAccount;
            remainAccounts.push({
                pubkey: toTokenAccount,
                isWritable: true,
                isSigner: false,
            });//1
        }

        console.log(accounts);

        //from
        if(fromTokenAccount != null){
            remainAccounts.push({
                pubkey: fromTokenAccount,
                isWritable: true,
                isSigner: false,
            });
        }//2
        //authority
        remainAccounts.push({
            pubkey: payer.publicKey,
            isWritable: false,
            isSigner: false,
        });//3
        //mint
        if(mint != null){
            remainAccounts.push({
                pubkey: mint,
                isWritable: false,
                isSigner: false,
            }); 
        }//4
        //tokenProgram
        remainAccounts.push({
            pubkey: TOKEN_2022_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
        });//5
        console.log(remainAccounts);       

        try{
            const instruction = await program.methods.entitySaleBid(full_name)
                .accounts(accounts)
                .signers([payer])
                .remainingAccounts(remainAccounts)
                .instruction();
            const transaction = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                instruction
                );
                
            const tx = await provider.sendAndConfirm(transaction, [payer], {
                commitment: "confirmed",
            });
                
            console.log("🎉 Transaction successful:", tx);
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
    }); 

    it('entity owner transfer', async () => {
        console.log("--- entity owner transfer ----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","ons://net"];
        let nPos = 0;
        const full_name = name_arr[nPos];
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());

        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());

        const [bodyPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("body"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", bodyPDA.toString());

        try{
            await program.methods.entityOwnerTransfer(full_name, newOwner.publicKey)
                .accounts({
                    header: headerPDA,
                    meta: metaPDA,
                    body: bodyPDA,
                    operator: payer.publicKey,
                    newOwner: newOwner.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
        let metaAccount = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("meta: ", metaAccount);
        let bodyAccount = await program.account.authJsonConfig.fetch(bodyPDA);
        console.log("body: ", bodyAccount);
    }); 

    it('entity rent ask', async () => {
        console.log("--- entityrent ask----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());        
        const rent_per_day = new anchor.BN(1_000_000);

        try{
            await program.methods.entityRentAsk(full_name, 1, rent_per_day)
                .accounts({
                    header: headerPDA,
                    operator: payer.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
    }); 

    it('entity rent bid', async () => {
        console.log("--- entity rent bid----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());
        let metaConfig = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("metaconfig:", metaConfig);
        const jsonConfig = JSON.parse(metaConfig.configJson);
        const feeReceiver = jsonConfig.fee_receiver; 

        const [rentInfoPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("rent"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got rent info PDA:", rentInfoPDA.toString());

        const allParentNames = extractParentNames(full_name);
        console.log(allParentNames);
        let allNamesLength = allParentNames.length;
        let parent_name = allParentNames[allNamesLength - 2];
        let eco_name = allParentNames[0];
        console.log(`parent_name: ${parent_name} eco_name:${eco_name}`);

        let [ecoMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(eco_name))],
            program.programId
        );            
        const ecoAccountInfo = await provider.connection.getAccountInfo(ecoMetaPDA);    
        if (!ecoAccountInfo) {
            console.log(`Meta PDA not found for: ${eco_name} (${ecoMetaPDA.toBase58()})`);
            return; 
        }
        let ecoConfig = await program.account.authJsonConfig.fetch(ecoMetaPDA);
        const ecoJsonConfig = JSON.parse(ecoConfig.configJson);   
        let payTokenStr = ecoJsonConfig.pay_token;

        let fromTokenAccount = null;//new PublicKey("3pv2qgomqCMpsRffobkzdtbdL9oNvNVR8vXTuoEwvjf7");
        let mint = null;
        let remainAccounts = [];

        let accounts: any = {
            header: headerPDA,
            meta: metaPDA,
            systemProgram: anchor.web3.SystemProgram.programId,            
            operator: payer.publicKey,
            rentInfo: rentInfoPDA,
        };

        const fromOwner = wallet.payer;
        const [protocolConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got protocol config PDA:", protocolConfigPDA.toString());
        let protocolConfig = await program.account.authJsonConfig.fetch(protocolConfigPDA);
        const protocolJsonConfig = JSON.parse(protocolConfig.configJson);   
        let protocolReceiver = protocolJsonConfig.fee_receiver;         
        accounts[`protocolConfig`] = protocolConfigPDA;
        accounts[`protocolFeeReceiver`] = new anchor.web3.PublicKey(protocolReceiver);
        accounts[`feeReceiver`] = new anchor.web3.PublicKey(feeReceiver);

        remainAccounts.push({
            pubkey: ecoMetaPDA,
            isWritable: false,
            isSigner: false,
        });

        if(payTokenStr != "11111111111111111111111111111111111111111111"){
            mint = new anchor.web3.PublicKey(payTokenStr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );

            const toOwner = new PublicKey(feeReceiver);  
            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
                );
            let toTokenAccount = toTokenAccountAta.address;
            //accounts[`toAta${i}`] = toTokenAccount;
            remainAccounts.push({
                pubkey: toTokenAccount,
                isWritable: true,
                isSigner: false,
            });//1
        }

        console.log(accounts);

        //from
        if(fromTokenAccount != null){
            remainAccounts.push({
                pubkey: fromTokenAccount,
                isWritable: true,
                isSigner: false,
            });
        }//2
        //authority
        remainAccounts.push({
            pubkey: payer.publicKey,
            isWritable: false,
            isSigner: false,
        });//3
        //mint
        if(mint != null){
            remainAccounts.push({
                pubkey: mint,
                isWritable: false,
                isSigner: false,
            }); 
        }//4
        //tokenProgram
        remainAccounts.push({
            pubkey: TOKEN_2022_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
        });//5
        console.log(remainAccounts);      

        try{
            const instruction = await program.methods.entityRentBid(full_name, 1)
                .accounts(accounts)
                .signers([payer])
                .remainingAccounts(remainAccounts)
                .instruction();
            const transaction = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                instruction
                );                
            const tx = await provider.sendAndConfirm(transaction, [payer], {
                commitment: "confirmed",
            });
                
            console.log("🎉 Transaction successful:", tx);
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
    }); 

    it('entity rent info update', async () => {
        console.log("---entity rent info update----");
        const payer = wallet.payer;
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","ons://net"];
        let nPos = 0;
        const full_name = name_arr[nPos];     
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        const [rentInfoPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("rent"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got body PDA:", rentInfoPDA.toString());
        let oldConfigAccount = await program.account.authJsonConfig.fetch(rentInfoPDA);    
        console.log("old json config:", oldConfigAccount);

        const info_json = `rent info2....`;
        try{
            await program.methods.entityRentInfoUpdate(full_name, info_json)
                .accounts({
                    header: headerPDA,
                    rentInfo: rentInfoPDA,
                    updater: payer.publicKey,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        }    
        let newConfigAccount = await program.account.authJsonConfig.fetch(rentInfoPDA);
        console.log("new meta:", newConfigAccount);        
    });

    it('entity rent renew', async () => {
        console.log("--- entity rent renew----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","open://net"];
        let nPos = 3;
        const full_name = name_arr[nPos];     
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());
        let metaConfig = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("metaconfig:", metaConfig);
        const jsonConfig = JSON.parse(metaConfig.configJson);
        const feeReceiver = jsonConfig.fee_receiver; 

        const allParentNames = extractParentNames(full_name);
        console.log(allParentNames);
        let allNamesLength = allParentNames.length;
        let parent_name = allParentNames[allNamesLength - 2];
        let eco_name = allParentNames[0];
        console.log(`parent_name: ${parent_name} eco_name:${eco_name}`);

        let [ecoMetaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(eco_name))],
            program.programId
        );            
        const ecoAccountInfo = await provider.connection.getAccountInfo(ecoMetaPDA);    
        if (!ecoAccountInfo) {
            console.log(`Meta PDA not found for: ${eco_name} (${ecoMetaPDA.toBase58()})`);
            return; 
        }
        let ecoConfig = await program.account.authJsonConfig.fetch(ecoMetaPDA);
        const ecoJsonConfig = JSON.parse(ecoConfig.configJson);   
        let payTokenStr = ecoJsonConfig.pay_token;

        let fromTokenAccount = null;//new PublicKey("3pv2qgomqCMpsRffobkzdtbdL9oNvNVR8vXTuoEwvjf7");
        let mint = null;
        let remainAccounts = [];

        let accounts: any = {
            header: headerPDA,
            meta: metaPDA,
            systemProgram: anchor.web3.SystemProgram.programId,            
            operator: payer.publicKey,
        };

        const [protocolConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got protocol config PDA:", protocolConfigPDA.toString());
        let protocolConfig = await program.account.authJsonConfig.fetch(protocolConfigPDA);
        const protocolJsonConfig = JSON.parse(protocolConfig.configJson);   
        let protocolReceiver = protocolJsonConfig.fee_receiver;         
        accounts[`protocolConfig`] = protocolConfigPDA;
        accounts[`protocolFeeReceiver`] = new anchor.web3.PublicKey(protocolReceiver);
        accounts[`feeReceiver`] = new anchor.web3.PublicKey(feeReceiver);

        remainAccounts.push({
            pubkey: ecoMetaPDA,
            isWritable: false,
            isSigner: false,
        });

        const fromOwner = wallet.payer;
           
        if(payTokenStr != "11111111111111111111111111111111111111111111"){
            mint = new anchor.web3.PublicKey(payTokenStr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );

            const toOwner = new PublicKey(feeReceiver);  
            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
                );
            let toTokenAccount = toTokenAccountAta.address;
            //accounts[`toAta${i}`] = toTokenAccount;
            remainAccounts.push({
                pubkey: toTokenAccount,
                isWritable: true,
                isSigner: false,
            });//1
        }

        console.log(accounts);

        //from
        if(fromTokenAccount != null){
            remainAccounts.push({
                pubkey: fromTokenAccount,
                isWritable: true,
                isSigner: false,
            });
        }//2
        //authority
        remainAccounts.push({
            pubkey: payer.publicKey,
            isWritable: false,
            isSigner: false,
        });//3
        //mint
        if(mint != null){
            remainAccounts.push({
                pubkey: mint,
                isWritable: false,
                isSigner: false,
            }); 
        }//4
        //tokenProgram
        remainAccounts.push({
            pubkey: TOKEN_2022_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
        });//5
        console.log(remainAccounts);

        try{
            const instruction = await program.methods.entityRentRenew(full_name, 10)
                .accounts(accounts)
                .signers([payer])
                .remainingAccounts(remainAccounts)
                .instruction();
            const transaction = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                instruction
                );                
            const tx = await provider.sendAndConfirm(transaction, [payer], {
                commitment: "confirmed",
            });
                
            console.log("🎉 Transaction successful:", tx);
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
        const new_expire_timestamp = headerAccount.userEnd;
        const new_expire_date = new Date(new_expire_timestamp * 1000);
        console.log("new expire_date:",new_expire_date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
    }); 

    it('entity rent transfer', async () => {
        console.log("--- entity owner transfer ----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const name_arr = ["ons://api.devnet.openverse.net","ons://devnet.openverse.net","ons://openverse.net","ons://net"];
        let nPos = 0;
        const full_name = name_arr[nPos];     
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());

        const [rentInfoPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("rent"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", rentInfoPDA.toString());

        try{
            await program.methods.entityRentTransfer(full_name, newOwner.publicKey)
                .accounts({
                    header: headerPDA,
                    rentInfo: rentInfoPDA,
                    operator: payer.publicKey,
                    newOwner: newOwner.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([payer])
                .rpc();
        }catch(error){
            if (error instanceof AnchorError) {
                console.log("Transaction failed:", error.message);
                console.log("Program Logs:");
                
                error.logs?.forEach((log, i) => {
                    console.log(`  [${i}] ${log}`);
                });
            
                const validationErrors = error.logs
                    ?.filter(log => log.includes("Validation error"))
                    .map(log => {
                    const match = log.match(/Validation error \[\d+\]: (.+)/);
                    return match ? match[1] : log;
                    }) || [];
            
                if (validationErrors.length > 0) {
                    console.error("Validation Errors:");
                    validationErrors.forEach(err => console.error(`  • ${err}`));
                }
            } else {
                console.error("Unknown error:", error);                
            }
            return;
        } 

        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("header: ", headerAccount);
        let infoAccount = await program.account.authJsonConfig.fetch(rentInfoPDA);
        console.log("meta: ", infoAccount);
    }); 
});

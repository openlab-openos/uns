import * as anchor from "@coral-xyz/anchor";
import { Program,AnchorError} from "@coral-xyz/anchor";
import { Ons } from "../target/types/ons";
import { PublicKey, Keypair } from '@solana/web3.js';
import { expect, assert} from 'chai';
import { sha256 } from "@noble/hashes/sha256";
import {
    getAccount,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountIdempotent,
    TOKEN_2022_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,ASSOCIATED_TOKEN_PROGRAM_ID,
  } from 'open-token-web3';
import { min } from "bn.js";

function getHashPrefix(input: string): Uint8Array {
    return sha256(new TextEncoder().encode(input)).slice(0, 16);
}

describe("ons", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.Ons as Program<Ons>;
    const provider = anchor.AnchorProvider.env();
    const wallet = provider.wallet as anchor.Wallet;
    //console.log(wallet.publicKey.toString());

    it('eco create', async () => {
        console.log("---- create eco ----");
        const payer = wallet.payer;
        //const parent = anchor.web3.Keypair.generate(); // Assuming this is a PDA or already existing domain
        //const full_name = "very.longloonglonglonglongglonglonglonglonglonglonglongl2onglonglonglonglo.subdomain.example.ons";        
        //const full_name = "openverse";
        //pay_token=Cmdnkd1MJBfKuBjp3j33BqeesZCYrnJ4mXnk19Uhs3z2
        //pay_token=11111111111111111111111111111111111111111111
        const full_name = "open";
        const meta_json = `{
            "version": "1.0.0",
            "cycle_fees": 1000000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
            "pay_token":"Cmdnkd1MJBfKuBjp3j33BqeesZCYrnJ4mXnk19Uhs3z2",
            "title":"",
            "icon":"",
            "uri":"",  
            "description": ""
        }`;
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
        await program.methods.ecoCreate(full_name, meta_json, body_json, years)
            .accounts({
                operator: payer.publicKey,
                header: headerPDA,
                meta: metaPDA,
                body: bodyPDA,
                treasury: treasuryConfigPDA,
                feeReceiver: feeReceiver, // Use the fee receiver as the treasury
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

    it('eco close', async () => {
        console.log("---- ecoclose ----");
        const payer = wallet.payer;
        //const parent = anchor.web3.Keypair.generate(); // Assuming this is a PDA or already existing domain
        //const full_name = "very.longloonglonglonglongglonglonglonglonglonglonglongl2onglonglonglonglo.subdomain.example.ons";        
        //const full_name = "openverse";
        //pay_token=Cmdnkd1MJBfKuBjp3j33BqeesZCYrnJ4mXnk19Uhs3z2
        //pay_token=11111111111111111111111111111111111111111111
        const full_name = "ons";        
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

    it('eco meta update token', async () => {
        console.log("---ecometa update token----");
        const payer = wallet.payer;
        const full_name = "open";
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
        //pay_token=Cmdnkd1MJBfKuBjp3j33BqeesZCYrnJ4mXnk19Uhs3z2
        //pay_token=11111111111111111111111111111111111111111111

        const meta_json = `{
            "version": "1.0.0",
            "cycle_fees": 1000000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
            "pay_token":"11111111111111111111111111111111111111111111",
            "title":"",
            "icon":"",
            "uri":"",  
            "description": "2"
        }`;
        try{
            await program.methods.ecoMetaUpdate(full_name, meta_json)
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

    it('eco owner renew ', async () => {
        console.log("---renew eco---");
        //const payer = Keypair.generate();
        const payer = wallet.payer;
        const full_name = "open";
        const years = 2;
        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );

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

        let oldHeaderAccount = await program.account.headerInfo.fetch(headerPDA);
        console.log("old HeaderAccount:", oldHeaderAccount)
        const expire_timestamp = oldHeaderAccount.ownerEnd;
        const expire_date = new Date(expire_timestamp * 1000);
        console.log("old expire_date:",expire_date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));

        // Renew Domain
        try{
            await program.methods.ecoOwnerRenew(full_name, years)
                .accounts({
                    header: headerPDA,
                    operator: payer.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    treasuryConfig: treasuryConfigPDA,
                    feeReceiver: feeReceiver,
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
        console.log("begin to verify domain account..");   
        let headerAccount = await program.account.headerInfo.fetch(headerPDA);
        //console.log("domainAccount.expires_at:", domainAccount.expiresAt);
        const new_expire_timestamp = headerAccount.ownerEnd;
        const new_expire_date = new Date(new_expire_timestamp * 1000);
        console.log("new expire_date:",new_expire_date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
        //expect(domainAccount.expirest).to.be.greaterThan(domainAccount.created_at + 365 * 24 * 60 * 60); // Ensure expiry is extended by at least one year
    });

    it('eco meta update native', async () => {
        console.log("---ecometa update native----");
        const payer = wallet.payer;
        const full_name = "ons";
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
            "pay_token":"11111111111111111111111111111111111111111111",
            "title":"",
            "icon":"",
            "uri":"",  
            "description": "2"
        }`;
        try{
            await program.methods.ecoMetaUpdate(full_name, meta_json)
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

    it('Update meta eco must be failure', async () => {
        console.log("---Update meta eco must be failure----");
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
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());
        let oldConfigAccount = await program.account.authJsonConfig.fetch(metaPDA);    
        console.log("old meta:", oldConfigAccount);

        const updatedConfigJson = '{"new_resolver":"updated.example.com"}';
        await program.methods.ecoMetaUpdate(full_name, updatedConfigJson)
            .accounts({
                header: headerPDA,
                meta: metaPDA,
                updater: updater.publicKey,
            })
            .signers([updater])
            .rpc();

        let newConfigAccount = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("new meta:", newConfigAccount);
    });
    it('eco body update', async () => {
        console.log("---Update body eco----");
        const payer = wallet.payer;
        const full_name = "open";
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
            await program.methods.ecoBodyUpdate(full_name, body_json)
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

    it('Update meta eco must be failure', async () => {
        console.log("---Update meta eco must be failure----");
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
        await program.methods.ecoBodyUpdate(full_name, body_json)
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

    it('eco sale ask', async () => {
        console.log("--- ecosale ask----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "open";
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());        
        const sell_price = new anchor.BN(1_000_000);

        try{
            await program.methods.ecoSaleAsk(full_name, 1, sell_price)
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

    it('eco sale bid', async () => {
        console.log("--- ecosale bid----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "open";
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
        console.log("feeReceiver:", feeReceiver);
        const mintstr = jsonConfig.pay_token;
        console.log("mint:", mintstr);
        let mint = null;
        let fromTokenAccount = null;
        let toTokenAccount = null;
        const fromOwner = wallet.payer;    
        const toOwner = new PublicKey(feeReceiver);;           
        if(mintstr != "11111111111111111111111111111111111111111111")
        {
            mint = new anchor.web3.PublicKey(mintstr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );
            console.log('fromTokenAccount:', fromTokenAccount.toBase58());
    
            let fromAccount;
            try {
                fromAccount = await getAccount(
                    provider.connection,
                    fromTokenAccount,
                    undefined,
                    TOKEN_2022_PROGRAM_ID
                );
            } catch (err) {
                assert.fail(`fromTokenAccount not found: ${fromTokenAccount.toBase58()}. Make sure it exists and has tokens.`);
            }
            console.log("fromTokenAccount: ", fromTokenAccount.toBase58());

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
              toTokenAccount = toTokenAccountAta.address;
        }        

        try{
            await program.methods.ecoSaleBid(full_name)
                .accounts({                    
                    header: headerPDA,
                    meta: metaPDA,
                    body:bodyPDA,
                    operator: payer.publicKey,
                    feeReceiver: new anchor.web3.PublicKey(feeReceiver),
                    fromTokenAccount: fromTokenAccount,
                    toTokenAccount: toTokenAccount,                    
                    mint: mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
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

    it('eco owner transfer', async () => {
        console.log("--- eco owner transfer ----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "open";
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
            await program.methods.ecoOwnerTransfer(full_name, newOwner.publicKey)
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

    it('eco rent ask', async () => {
        console.log("--- ecorent ask----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "open";
        const payer = wallet.payer;

        const [headerPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("name"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got header PDA:", headerPDA.toString());        
        const rent_per_day = new anchor.BN(1_000_000);

        try{
            await program.methods.ecoRentAsk(full_name, 1, rent_per_day)
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

    it('eco rent bid', async () => {
        console.log("--- eco rent bid----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "ons";
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
        console.log("got rent info PDA:", rentInfoPDA.toString());
        const [metaPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("meta"), Buffer.from(getHashPrefix(full_name))],
            program.programId
        );
        console.log("got meta PDA:", metaPDA.toString());
        let metaConfig = await program.account.authJsonConfig.fetch(metaPDA);
        console.log("metaconfig:", metaConfig);
        const jsonConfig = JSON.parse(metaConfig.configJson);
        const feeReceiver = jsonConfig.fee_receiver;
        console.log("feeReceiver:", feeReceiver);
        const mintstr = jsonConfig.pay_token;
        console.log("mint:", mintstr);
        let mint = null;
        let fromTokenAccount = null;
        let toTokenAccount = null;
        const fromOwner = wallet.payer;    
        const toOwner = new PublicKey(feeReceiver);;           
        if(mintstr != "11111111111111111111111111111111111111111111")
        {
            mint = new anchor.web3.PublicKey(mintstr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );
            console.log('fromTokenAccount:', fromTokenAccount.toBase58());
    
            let fromAccount;
            try {
                fromAccount = await getAccount(
                    provider.connection,
                    fromTokenAccount,
                    undefined,
                    TOKEN_2022_PROGRAM_ID
                );
            } catch (err) {
                assert.fail(`fromTokenAccount not found: ${fromTokenAccount.toBase58()}. Make sure it exists and has tokens.`);
            }
            console.log("fromTokenAccount: ", fromTokenAccount.toBase58());

            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_2022_PROGRAM_ID
              );
              toTokenAccount = toTokenAccountAta.address;
        }        

        try{
            await program.methods.ecoRentBid(full_name, 1)
                .accounts({                    
                    header: headerPDA,
                    meta: metaPDA,
                    rentInfo:rentInfoPDA,
                    operator: payer.publicKey,
                    feeReceiver: new anchor.web3.PublicKey(feeReceiver),
                    fromTokenAccount: fromTokenAccount,
                    toTokenAccount: toTokenAccount,                    
                    mint: mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
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

    it('eco rent info update', async () => {
        console.log("---eco rent info update----");
        const payer = wallet.payer;
        const full_name = "ons";
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
            await program.methods.ecoRentInfoUpdate(full_name, info_json)
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

    it('eco rent renew', async () => {
        console.log("--- eco rent renew----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "ons";
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
        console.log("feeReceiver:", feeReceiver);
        const mintstr = jsonConfig.pay_token;
        console.log("mint:", mintstr);
        let mint = null;
        let fromTokenAccount = null;
        let toTokenAccount = null;
        const fromOwner = wallet.payer;    
        const toOwner = new PublicKey(feeReceiver);;           
        if(mintstr != "11111111111111111111111111111111111111111111")
        {
            mint = new anchor.web3.PublicKey(mintstr);
            fromTokenAccount = getAssociatedTokenAddressSync(
                mint,
                fromOwner.publicKey,
                false, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );
            console.log('fromTokenAccount:', fromTokenAccount.toBase58());
    
            let fromAccount;
            try {
                fromAccount = await getAccount(
                    provider.connection,
                    fromTokenAccount,
                    undefined,
                    TOKEN_2022_PROGRAM_ID
                );
            } catch (err) {
                assert.fail(`fromTokenAccount not found: ${fromTokenAccount.toBase58()}. Make sure it exists and has tokens.`);
            }
            console.log("fromTokenAccount: ", fromTokenAccount.toBase58());

            const toTokenAccountAta = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                fromOwner,// fee payer
                mint,//token
                toOwner,
                false,
                'confirmed',
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_2022_PROGRAM_ID
              );
              toTokenAccount = toTokenAccountAta.address;
        }        

        try{
            await program.methods.ecoRentRenew(full_name, 30)
                .accounts({                    
                    header: headerPDA,
                    meta: metaPDA,
                    operator: payer.publicKey,
                    feeReceiver: new anchor.web3.PublicKey(feeReceiver),
                    fromTokenAccount: fromTokenAccount,
                    toTokenAccount: toTokenAccount,                    
                    mint: mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
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
        const new_expire_timestamp = headerAccount.userEnd;
        const new_expire_date = new Date(new_expire_timestamp * 1000);
        console.log("new expire_date:",new_expire_date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
    }); 

    it('eco rent transfer', async () => {
        console.log("--- eco owner transfer ----");
        const newOwner = anchor.web3.Keypair.generate(); 
        console.log("new owner:", newOwner.publicKey.toString());
        const full_name = "ons";
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
            await program.methods.ecoRentTransfer(full_name, newOwner.publicKey)
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

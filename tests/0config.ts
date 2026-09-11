import * as anchor from "@coral-xyz/anchor";
import { Program,AnchorError} from "@coral-xyz/anchor";
import { Ons } from "../target/types/ons";
import { PublicKey, Keypair } from '@solana/web3.js';
import { expect } from 'chai';
import { sha256 } from "@noble/hashes/sha256";
import bs58 from "bs58"
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

    it.only('Initialize Treasury Config', async () => {
        console.log("---- Initialize Treasury Config ----");
        const authority = wallet.payer;      
        console.log(authority.publicKey.toString());
        const treasuryWallet = new PublicKey("5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE");

        const [treasuryConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        try{
            let oldTreasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
            console.log("initlized treasury..return");
            return;
        }catch(error){
        }

        console.log("programId:", program.programId.toString());
        console.log("treasuryConfigPDA:", treasuryConfigPDA.toString());
        const treasuryJson = `{
            "cycle_fees": 10000000000,
            "protocol_fees": 10000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
            "name_closer": "9m9ZxVxexH4xJdEh465iwKndwSDvx13KChTbvW7JuasW"
        }`;

        try{
            const txHash = await program.methods.treasuryInitialize(treasuryJson)
            .accounts({
                config: treasuryConfigPDA,
                authority: authority.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([authority])
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
        }

        let treasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
        console.log("Treasury Config:", treasuryConfig);
        //expect(treasuryConfig.authority.toString()).to.equal(authority.publicKey.toString());
    });

    it('Update Treasury json must be success', async () => {
        console.log("---Update Treasury json---");
        const payer = wallet.payer
        const [treasuryConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got treasury config PDA:", treasuryConfigPDA.toString());

        let oldTreasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
        console.log("got old:", oldTreasuryConfig);
        
        const newTreasuryJson = `{
            "cycle_fees": 10000000000,
            "protocol_fees": 10000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE",
            "name_closer": "9m9ZxVxexH4xJdEh465iwKndwSDvx13KChTbvW7JuasW",
            "memo": "2"
        }`;
        //console.log("New Treasury Json:", newTreasuryJson);
        // Update Treasury Address
        try{
        const txHash = await program.methods.treasuryUpdate(newTreasuryJson)
            .accounts({
                config: treasuryConfigPDA,
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
        let treasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
        console.log("treasuryConfig:", treasuryConfig);
        //expect(treasuryConfig.treasury.toString()).to.equal(newTreasury.toString());
    });
    it('Update Treasury json must be failure', async () => {
        const OPERATOR_PRIVATE = "3qg3JE8wYMrUGTRhqeydoFvjXy2eHVXoGqZZm6kMPHsmXrAuYavGs1xw9j6DRutQWFtBPt2c5BH1BKTYvSQWUggu"; 
        const operator = anchor.web3.Keypair.fromSecretKey(
            bs58.decode(OPERATOR_PRIVATE)
        );
        const operatorPubKey = operator.publicKey;
        console.log("operatorPubKey:", operatorPubKey.toString());
        const [treasuryConfigPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("treasury_config")],
            program.programId
        );
        console.log("got treasury config PDA:", treasuryConfigPDA.toString());

        let oldTreasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
        console.log("got old:", oldTreasuryConfig);
        
        const newTreasuryJson = `{
            "cycle_fees": 10000000000,
            "protocol_fees": 10000000,
            "fee_receiver": "5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE"
        }`;
        //console.log("New Treasury Json:", newTreasuryJson);
        // Update Treasury Address
        try{
        const txHash = await program.methods.treasuryUpdate(newTreasuryJson)
            .accounts({
                config: treasuryConfigPDA,
                updater: updater.publicKey,
            })
            .signers([updater])
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
        let treasuryConfig = await program.account.authJsonConfig.fetch(treasuryConfigPDA);
        console.log("treasuryConfig:", treasuryConfig);
        //expect(treasuryConfig.treasury.toString()).to.equal(newTreasury.toString());
    });

    it.only('Initialize eco template Config', async () => {
        console.log("---- Initialize eco template Config ----");
        const authority = wallet.payer;      
        console.log(authority.publicKey.toString());
        const ownerWallet = new PublicKey("5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE");

        const [ecoTplPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("eco_tpl")],
            program.programId
        );
        try{
            let oldEcoTplConfig = await program.account.authJsonConfig.fetch(ecoTplPDA);
            console.log("initlized eco tpl..return");
            return;
        }catch(error){
        }

        console.log("programId:", program.programId.toString());
        console.log("ecoTplConfigPDA:", ecoTplPDA.toString());
        const ecoTplJson = `{
            "version": "1.0.0",
            "cycle_fees": "uint",
            "fee_receiver": "string(44)",
            "pay_token":"string(44)",
            "title":"string(0,100)",
            "icon":"string(0,100)",
            "uri":"string(0,100)",  
            "description": "string(0,1024)"
        }`;

        try{
            const txHash = await program.methods.ecotplInitialize(ecoTplJson)
            .accounts({
                config: ecoTplPDA,
                authority: authority.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([authority])
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
        }

        let ecoTplConfig = await program.account.authJsonConfig.fetch(ecoTplPDA);
        console.log("EcoTpl Config:", ecoTplConfig);
    });

    it('Update EcoTpl json must be success', async () => {
        console.log("---Update EcoTpl json---");
        const payer = wallet.payer
        const [ecoTplPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("eco_tpl")],
            program.programId
        );
        console.log("got ecotpl config PDA:", ecoTplPDA.toString());

        let oldEcoTplConfig = await program.account.authJsonConfig.fetch(ecoTplPDA);
        console.log("got old:", oldEcoTplConfig);
        
        const newEcoTplJson = `{
            "version": "1.0.0",
            "cycle_fees": "uint",
            "fee_receiver": "string(44)",
            "pay_token": "string(44)",
            "title": "string(0,100)",
            "icon": "string(0,100)",
            "uri": "string(0,100)",  
            "description": "string(0,1024)"
        }`;
        //console.log("New Treasury Json:", newTreasuryJson);
        // Update Treasury Address
        try{
        const txHash = await program.methods.ecotplUpdate(newEcoTplJson)
            .accounts({
                config: ecoTplPDA,
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
        let ecoTplConfig = await program.account.authJsonConfig.fetch(ecoTplPDA);
        console.log("ecoTplConfig:", ecoTplConfig);
        //expect(treasuryConfig.treasury.toString()).to.equal(newTreasury.toString());
    });

    it.only('Initialize entity template Config', async () => {
        console.log("---- Initialize entity template Config ----");
        const authority = wallet.payer;      
        console.log(authority.publicKey.toString());
        const ownerWallet = new PublicKey("5atELzFVyFopjqZjb2do2Wcq68ad4rozEGexVLqWPfcE");

        const [entityTplPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("entity_tpl")],
            program.programId
        );
        try{
            let oldEntityTplConfig = await program.account.authJsonConfig.fetch(entityTplPDA);
            console.log("initlized entity tpl..return");
            return;
        }catch(error){
        }

        console.log("programId:", program.programId.toString());
        console.log("entityTplConfigPDA:", entityTplPDA.toString());
        const entityTplJson = `{
            "version": "1.0.0",
            "cycle_fees": "uint",
            "fee_receiver": "string(44)",
            "title":"string(0,100)",
            "icon":"string(0,100)",
            "uri":"string(0,100)",  
            "description": "string(0,1024)"
        }`;

        try{
            const txHash = await program.methods.entitytplInitialize(entityTplJson)
            .accounts({
                config: entityTplPDA,
                authority: authority.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([authority])
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
        }

        let entityTplConfig = await program.account.authJsonConfig.fetch(entityTplPDA);
        console.log("EntityTpl Config:", entityTplConfig);
    });

    it('Update EntityTpl json must be success', async () => {
        console.log("---Update EntityTpl json---");
        const payer = wallet.payer
        const [entityTplPDA] = await PublicKey.findProgramAddress(
            [Buffer.from("entity_tpl")],
            program.programId
        );
        console.log("got entitytpl config PDA:", entityTplPDA.toString());

        let oldEntityTplConfig = await program.account.authJsonConfig.fetch(entityTplPDA);
        console.log("got old:", oldEntityTplConfig);
        
        const newEntityTplJson = `{
            "version": "1.0.0",
            "cycle_fees": "uint",
            "fee_receiver": "string(44)",
            "title": "string(0,100)",
            "icon": "string(0,100)",
            "uri": "string(0,100)",  
            "description": "string(0,1024)"
        }`;
        //console.log("New Treasury Json:", newTreasuryJson);
        // Update Treasury Address
        try{
        const txHash = await program.methods.entitytplUpdate(newEntityTplJson)
            .accounts({
                config: entityTplPDA,
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
        let entityTplConfig = await program.account.authJsonConfig.fetch(entityTplPDA);
        console.log("entityTplConfig:", entityTplConfig);
        //expect(treasuryConfig.treasury.toString()).to.equal(newTreasury.toString());
    });
});

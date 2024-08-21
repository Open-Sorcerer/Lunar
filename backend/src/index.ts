import { Connection, Keypair, PublicKey, sendAndConfirmRawTransaction, Signer, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import dotenv from "dotenv"
import bs58 from "bs58";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

dotenv.config()

const POOL_ADDRESS = new PublicKey("61vGBCJ5DTDax5e5p1f7f96PTzDC78GUggsUtaicdH81")

const KEYPAIR = Keypair.fromSecretKey(
  bs58.decode(process.env.KEYPAIR_1!)
);

const solanaConnection = new Connection(process.env.RPC_ENDPOINT_SOLANA!)
const eclipseConnection = new Connection(process.env.RPC_ENDPOINT_ECLIPSE!)

async function main() {

  solanaConnection.onLogs(POOL_ADDRESS, async (logData) => {
    if (logData.err) return
    try {
      const parsedData = logData.logs
        .map(log => {
          const match = log.match(/to:(\w+),amount:(\d+)/);
          if (match) {
            return {
              to: match[1],
              amount: parseInt(match[2], 10)
            };
          }
          return null;
        })
        .find(item => item !== null);

      if (!parsedData || (!parsedData.amount && !parsedData.to)) return

      console.log(parsedData);

      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: KEYPAIR.publicKey,
          toPubkey: new PublicKey(parsedData.to),
          lamports: parsedData.amount,
        })
      );

      const messageToAddInMemo =
        "Bridged via Lunar"
      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: KEYPAIR.publicKey, isSigner: true, isWritable: true }],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(messageToAddInMemo, "utf-8"),
      });

      tx.add(memoInstruction);

      const blockhashResult = await eclipseConnection.getLatestBlockhash("finalized")

      tx.recentBlockhash = blockhashResult.blockhash
      tx.lastValidBlockHeight = blockhashResult.lastValidBlockHeight

      tx.sign(KEYPAIR)

      const signatureRaw = tx.signatures[0].signature;
      const signature = bs58.encode(signatureRaw!);

      console.log(signature);

      const confirmedTx = await sendAndConfirmRawTransaction(eclipseConnection, tx.serialize())

      console.log(`${new Date().toISOString()} Transaction successful on Eclipse`);
      console.log(`${new Date().toISOString()} Explorer URL: https://explorer.dev.eclipsenetwork.xyz/tx/${signature}?cluster=devnet`);
    } catch (e) {
      console.log(`ERROR: ${e}`);

    }
  });

}

main()

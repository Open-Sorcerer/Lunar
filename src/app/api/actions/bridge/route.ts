import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  MEMO_PROGRAM_ID,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";

const CONNECTION = new Connection(
  "https://devnet.helius-rpc.com/?api-key=0769fcf3-0514-4eee-95e7-485431ab941e",
  { commitment: "confirmed" }
);

const BRIDGE_ACCOUNT = new PublicKey(
  "61vGBCJ5DTDax5e5p1f7f96PTzDC78GUggsUtaicdH81"
);

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const baseHref = new URL(
      `/api/actions/bridge`,
      requestUrl.origin
    ).toString();

    const payload: ActionGetResponse = {
      title: "Bridge to Eclipse Devnet",
      icon: new URL("/next.svg", requestUrl.origin).toString(),
      description: "Bridge your assets to the Eclipse Devnet",
      label: "Bridge",
      links: {
        actions: [
          {
            label: "Bridge SOL ",
            href: `${baseHref}?amountInSOL={amountInSOL}`,
            parameters: [
              {
                name: "amountInSOL",
                label: "SOL Amount",
                required: true,
              },
            ],
          },
        ],
      },
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.error(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const amountInSOL = Number(
      requestUrl.searchParams.get("amountInSOL") || "0"
    );

    if (amountInSOL <= 0) {
      throw new Error("Invalid SOL amount");
    }

    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(account),
        toPubkey: new PublicKey(BRIDGE_ACCOUNT),
        lamports: LAMPORTS_PER_SOL * parseFloat(`${amountInSOL}`),
      })
    );

    const messageToAddInMemo =
      "to:" + account.toBase58() + ",amount:" + amountInSOL * LAMPORTS_PER_SOL;

    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: account, isSigner: true, isWritable: true }],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(messageToAddInMemo, "utf-8"),
    });

    transaction.add(memoInstruction);

    transaction.feePayer = new PublicKey(account);
    const latestBlockhash = await CONNECTION.getLatestBlockhash();

    transaction!.recentBlockhash = latestBlockhash.blockhash;
    transaction!.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: "Bridge to Eclipse Devnet",
      },
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.error(err);
    let message = "An unknown error occurred";
    if (err instanceof Error) message = err.message;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

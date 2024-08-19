import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  verifySignatureInfoForIdentity,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import axios from "axios";

const CONNECTION = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=0769fcf3-0514-4eee-95e7-485431ab941e",
  { commitment: "confirmed" }
);

const JUPITER_ENDPOINT = "https://quote-api.jup.ag/v6";
const SLIPPAGE_BPS = 50;
const PRIORITY_FEE_LAMPORTS = 20_000;

const tokenAddresses = {
  sol: "So11111111111111111111111111111111111111112",
  usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  jitoSol: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  mSol: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  bSol: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
};

interface SwapParams {
  toToken: keyof typeof tokenAddresses;
  percentage: number;
}

interface BatchSwapParams {
  totalUsdcAmount: number;
  swaps: SwapParams[];
}

const lstBasket: BatchSwapParams = {
  totalUsdcAmount: 1_000_000, // 1 USDC = 1,000,000 lamports
  swaps: [
    { toToken: "sol", percentage: 25 },
    { toToken: "jitoSol", percentage: 25 },
    { toToken: "mSol", percentage: 25 },
    { toToken: "bSol", percentage: 25 },
  ],
};

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const baseHref = new URL(
      `/api/actions/bridge`,
      requestUrl.origin
    ).toString();

    const payload: ActionGetResponse = {
      title: "Bridge to Eclipse Devnet",
      icon: new URL("/title.jpg", requestUrl.origin).toString(),
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

async function getRawTransaction(
  encodedTransaction: string
): Promise<Transaction | VersionedTransaction> {
  let recoveredTransaction: Transaction | VersionedTransaction;
  try {
    recoveredTransaction = Transaction.from(
      Buffer.from(encodedTransaction, "base64")
    );
    const latestBlockhash = await CONNECTION.getLatestBlockhash();
    recoveredTransaction.recentBlockhash = latestBlockhash.blockhash;
  } catch (error) {
    recoveredTransaction = VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(encodedTransaction, "base64"))
    );
  }
  return recoveredTransaction;
}

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

    const versionedTransaction = new VersionedTransaction();

    console.log(versionedTransaction.serialize());

    const actionResponse: ActionPostResponse = {
      transaction: uint8ArrayToBase64(versionedTransaction.serialize()),
      message: `Swapped`,
    };

    // return res.json(actionResponse);

    return Response.json(actionResponse, {
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

const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  return Buffer.from(uint8Array).toString("base64");
};

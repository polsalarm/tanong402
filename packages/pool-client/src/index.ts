import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Stats {
  students: u32;
  total_claimed: i128;
  total_funded: i128;
}


export interface Config {
  admin: string;
  allowance: i128;
  paused: boolean;
  period: u64;
  token: string;
}


export interface Student {
  enrolled: boolean;
  last_claim: u64;
  total_claimed: i128;
}

export const PoolError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"InvalidAmount"},
  3: {message:"InvalidPeriod"},
  4: {message:"NotEnrolled"},
  5: {message:"ClaimTooEarly"},
  6: {message:"Paused"},
  7: {message:"PoolEmpty"},
  8: {message:"ArithmeticOverflow"}
}








export interface Client {
  /**
   * Construct and simulate a fund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fund: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim: ({student}: {student: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a pause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pause: ({paused}: {paused: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a stats transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  stats: (options?: MethodOptions) => Promise<AssembledTransaction<Stats>>

  /**
   * Construct and simulate a config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  config: (options?: MethodOptions) => Promise<AssembledTransaction<Config>>

  /**
   * Construct and simulate a enroll transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  enroll: ({student}: {student: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a sponsor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  sponsor: ({address}: {address: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a student transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  student: ({address}: {address: string}, options?: MethodOptions) => Promise<AssembledTransaction<Student>>

  /**
   * Construct and simulate a unenroll transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unenroll: ({student}: {student: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw: ({to, amount}: {to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a enroll_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  enroll_batch: ({students}: {students: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a next_claim_at transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  next_claim_at: ({address}: {address: string}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a set_allowance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_allowance: ({amount, period}: {amount: i128, period: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, token, allowance, period}: {admin: string, token: string, allowance: i128, period: u64},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, token, allowance, period}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAEZnVuZAAAAAIAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAABAAAAAAAAAAdzdHVkZW50AAAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAAFcGF1c2UAAAAAAAABAAAAAAAAAAZwYXVzZWQAAAAAAAEAAAAA",
        "AAAAAAAAAAAAAAAFc3RhdHMAAAAAAAAAAAAAAQAAB9AAAAAFU3RhdHMAAAA=",
        "AAAAAAAAAAAAAAAGY29uZmlnAAAAAAAAAAAAAQAAB9AAAAAGQ29uZmlnAAA=",
        "AAAAAAAAAAAAAAAGZW5yb2xsAAAAAAABAAAAAAAAAAdzdHVkZW50AAAAABMAAAAA",
        "AAAAAAAAAAAAAAAHc3BvbnNvcgAAAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAAHc3R1ZGVudAAAAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAABAAAH0AAAAAdTdHVkZW50AA==",
        "AAAAAAAAAAAAAAAIdW5lbnJvbGwAAAABAAAAAAAAAAdzdHVkZW50AAAAABMAAAAA",
        "AAAAAAAAAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAMZW5yb2xsX2JhdGNoAAAAAQAAAAAAAAAIc3R1ZGVudHMAAAPqAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAlhbGxvd2FuY2UAAAAAAAALAAAAAAAAAAZwZXJpb2QAAAAAAAYAAAAA",
        "AAAAAAAAAAAAAAANbmV4dF9jbGFpbV9hdAAAAAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAEAAAAG",
        "AAAAAAAAAAAAAAANc2V0X2FsbG93YW5jZQAAAAAAAAIAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAGcGVyaW9kAAAAAAAGAAAAAA==",
        "AAAAAQAAAAAAAAAAAAAABVN0YXRzAAAAAAAAAwAAAAAAAAAIc3R1ZGVudHMAAAAEAAAAAAAAAA10b3RhbF9jbGFpbWVkAAAAAAAACwAAAAAAAAAMdG90YWxfZnVuZGVkAAAACw==",
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlhbGxvd2FuY2UAAAAAAAALAAAAAAAAAAZwYXVzZWQAAAAAAAEAAAAAAAAABnBlcmlvZAAAAAAABgAAAAAAAAAFdG9rZW4AAAAAAAAT",
        "AAAAAQAAAAAAAAAAAAAAB1N0dWRlbnQAAAAAAwAAAAAAAAAIZW5yb2xsZWQAAAABAAAAAAAAAApsYXN0X2NsYWltAAAAAAAGAAAAAAAAAA10b3RhbF9jbGFpbWVkAAAAAAAACw==",
        "AAAABAAAAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAAAgAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAQAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAAIAAAAAAAAADUludmFsaWRQZXJpb2QAAAAAAAADAAAAAAAAAAtOb3RFbnJvbGxlZAAAAAAEAAAAAAAAAA1DbGFpbVRvb0Vhcmx5AAAAAAAABQAAAAAAAAAGUGF1c2VkAAAAAAAGAAAAAAAAAAlQb29sRW1wdHkAAAAAAAAHAAAAAAAAABJBcml0aG1ldGljT3ZlcmZsb3cAAAAAAAg=",
        "AAAABQAAAAAAAAAAAAAABkZ1bmRlZAAAAAAAAQAAAAZmdW5kZWQAAAAAAAIAAAAAAAAAB3Nwb25zb3IAAAAAEwAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAABlBhdXNlZAAAAAAAAQAAAAZwYXVzZWQAAAAAAAEAAAAAAAAABnBhdXNlZAAAAAAAAQAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAB0NsYWltZWQAAAAAAQAAAAdjbGFpbWVkAAAAAAMAAAAAAAAAB3N0dWRlbnQAAAAAEwAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAAAAAAAmF0AAAAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAACEVucm9sbGVkAAAAAQAAAAhlbnJvbGxlZAAAAAEAAAAAAAAAB3N0dWRlbnQAAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACVdpdGhkcmF3bgAAAAAAAAEAAAAJd2l0aGRyYXduAAAAAAAAAgAAAAAAAAACdG8AAAAAABMAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAClVuZW5yb2xsZWQAAAAAAAEAAAAKdW5lbnJvbGxlZAAAAAAAAQAAAAAAAAAHc3R1ZGVudAAAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADUNvbmZpZ1VwZGF0ZWQAAAAAAAABAAAABmNvbmZpZwAAAAAAAgAAAAAAAAAJYWxsb3dhbmNlAAAAAAAACwAAAAAAAAAAAAAABnBlcmlvZAAAAAAABgAAAAAAAAAC" ]),
      options
    )
  }
  public readonly fromJSON = {
    fund: this.txFromJSON<null>,
        claim: this.txFromJSON<i128>,
        pause: this.txFromJSON<null>,
        stats: this.txFromJSON<Stats>,
        config: this.txFromJSON<Config>,
        enroll: this.txFromJSON<null>,
        sponsor: this.txFromJSON<i128>,
        student: this.txFromJSON<Student>,
        unenroll: this.txFromJSON<null>,
        withdraw: this.txFromJSON<null>,
        set_admin: this.txFromJSON<null>,
        enroll_batch: this.txFromJSON<null>,
        next_claim_at: this.txFromJSON<u64>,
        set_allowance: this.txFromJSON<null>
  }
}
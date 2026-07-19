# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Typed RPC convenience methods shared by the sync and async clients.

Each method delegates to ``self._call(method, params)``. In the sync client
``_call`` returns the result directly; in the async client it returns a
coroutine, so the same method works for both (callers ``await`` the async one).
Only methods that exist in KingPepe Core v31.1 are exposed.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from .money import format_kpepe

Amount = "int | str"


def _amount_to_rpc(amount: int | str) -> str:
    # Send amounts as exact decimal strings (Core parses these without float rounding).
    return format_kpepe(amount) if isinstance(amount, int) and not isinstance(amount, bool) else str(amount)


class ClientMethods:
    """Mixin providing typed wrappers. Requires ``_call(method, params)``."""

    def _call(self, method: str, params: Sequence[Any]) -> Any:  # pragma: no cover - overridden
        raise NotImplementedError

    # ---- Blockchain / node ----
    def get_blockchain_info(self) -> Any:
        return self._call("getblockchaininfo", [])

    def get_network_info(self) -> Any:
        return self._call("getnetworkinfo", [])

    def get_mempool_info(self) -> Any:
        return self._call("getmempoolinfo", [])

    def get_mining_info(self) -> Any:
        return self._call("getmininginfo", [])

    def get_block_count(self) -> Any:
        return self._call("getblockcount", [])

    def get_best_block_hash(self) -> Any:
        return self._call("getbestblockhash", [])

    def get_block_hash(self, height: int) -> Any:
        return self._call("getblockhash", [height])

    def get_block(self, blockhash: str, verbosity: int = 1) -> Any:
        return self._call("getblock", [blockhash, verbosity])

    def get_block_header(self, blockhash: str, verbose: bool = True) -> Any:
        return self._call("getblockheader", [blockhash, verbose])

    def get_chain_tips(self) -> Any:
        return self._call("getchaintips", [])

    def get_difficulty(self) -> Any:
        return self._call("getdifficulty", [])

    def get_raw_mempool(self, verbose: bool = False) -> Any:
        return self._call("getrawmempool", [verbose])

    def get_mempool_entry(self, txid: str) -> Any:
        return self._call("getmempoolentry", [txid])

    def get_tx_out(self, txid: str, n: int, include_mempool: bool = True) -> Any:
        return self._call("gettxout", [txid, n, include_mempool])

    def get_tx_out_set_info(self) -> Any:
        return self._call("gettxoutsetinfo", [])

    def uptime(self) -> Any:
        return self._call("uptime", [])

    def stop(self) -> Any:
        return self._call("stop", [])

    # ---- Address utilities (authoritative validation via the node) ----
    def validate_address(self, address: str) -> Any:
        return self._call("validateaddress", [address])

    def get_address_info(self, address: str) -> Any:
        return self._call("getaddressinfo", [address])

    # ---- Wallet ----
    def list_wallets(self) -> Any:
        return self._call("listwallets", [])

    def list_wallet_dir(self) -> Any:
        return self._call("listwalletdir", [])

    def create_wallet(self, name: str, *, disable_private_keys: bool = False, blank: bool = False,
                      passphrase: str = "", avoid_reuse: bool = False, descriptors: bool = True,
                      load_on_startup: bool | None = None) -> Any:
        return self._call("createwallet", [name, disable_private_keys, blank, passphrase,
                                           avoid_reuse, descriptors, load_on_startup])

    def load_wallet(self, name: str) -> Any:
        return self._call("loadwallet", [name])

    def unload_wallet(self, name: str | None = None) -> Any:
        return self._call("unloadwallet", [name] if name else [])

    def get_wallet_info(self) -> Any:
        return self._call("getwalletinfo", [])

    def get_balances(self) -> Any:
        return self._call("getbalances", [])

    def get_balance(self, minconf: int = 0) -> Any:
        return self._call("getbalance", ["*", minconf])

    def get_new_address(self, label: str = "", address_type: str | None = None) -> Any:
        return self._call("getnewaddress", [label, address_type] if address_type else [label])

    def get_raw_change_address(self, address_type: str | None = None) -> Any:
        return self._call("getrawchangeaddress", [address_type] if address_type else [])

    def list_transactions(self, label: str = "*", count: int = 10, skip: int = 0) -> Any:
        return self._call("listtransactions", [label, count, skip])

    def list_since_block(self, blockhash: str | None = None, target_confirmations: int = 1) -> Any:
        return self._call("listsinceblock", [blockhash, target_confirmations] if blockhash else [])

    def list_unspent(self, minconf: int = 1, maxconf: int = 9_999_999,
                     addresses: Sequence[str] | None = None) -> Any:
        params: list[Any] = [minconf, maxconf]
        if addresses is not None:
            params.append(list(addresses))
        return self._call("listunspent", params)

    def lock_unspent(self, unlock: bool, outputs: Sequence[dict] | None = None) -> Any:
        return self._call("lockunspent", [unlock, list(outputs)] if outputs else [unlock])

    def send_to_address(self, address: str, amount: int | str) -> Any:
        return self._call("sendtoaddress", [address, _amount_to_rpc(amount)])

    def send_many(self, amounts: dict[str, int | str]) -> Any:
        return self._call("sendmany", ["", {a: _amount_to_rpc(v) for a, v in amounts.items()}])

    def send_all(self, recipients: Sequence[Any]) -> Any:
        return self._call("sendall", [list(recipients)])

    def bump_fee(self, txid: str, options: dict | None = None) -> Any:
        return self._call("bumpfee", [txid, options] if options else [txid])

    def abandon_transaction(self, txid: str) -> Any:
        return self._call("abandontransaction", [txid])

    def get_transaction(self, txid: str, include_watchonly: bool = False) -> Any:
        return self._call("gettransaction", [txid, include_watchonly])

    def backup_wallet(self, destination: str) -> Any:
        return self._call("backupwallet", [destination])

    def wallet_passphrase(self, passphrase: str, timeout: int) -> Any:
        return self._call("walletpassphrase", [passphrase, timeout])

    def wallet_lock(self) -> Any:
        return self._call("walletlock", [])

    def wallet_passphrase_change(self, old_passphrase: str, new_passphrase: str) -> Any:
        return self._call("walletpassphrasechange", [old_passphrase, new_passphrase])

    def encrypt_wallet(self, passphrase: str) -> Any:
        return self._call("encryptwallet", [passphrase])

    def import_descriptors(self, requests: Sequence[Any]) -> Any:
        return self._call("importdescriptors", [list(requests)])

    def list_descriptors(self, private: bool = False) -> Any:
        return self._call("listdescriptors", [private])

    # ---- Transactions / PSBT ----
    def get_raw_transaction(self, txid: str, verbose: bool = False, blockhash: str | None = None) -> Any:
        return self._call("getrawtransaction", [txid, verbose, blockhash] if blockhash else [txid, verbose])

    def decode_raw_transaction(self, hexstring: str) -> Any:
        return self._call("decoderawtransaction", [hexstring])

    def decode_script(self, hexstring: str) -> Any:
        return self._call("decodescript", [hexstring])

    def create_raw_transaction(self, inputs: Sequence[Any], outputs: Any) -> Any:
        return self._call("createrawtransaction", [list(inputs), outputs])

    def fund_raw_transaction(self, hexstring: str, options: dict | None = None) -> Any:
        return self._call("fundrawtransaction", [hexstring, options] if options else [hexstring])

    def sign_raw_transaction_with_wallet(self, hexstring: str) -> Any:
        return self._call("signrawtransactionwithwallet", [hexstring])

    def send_raw_transaction(self, hexstring: str) -> Any:
        return self._call("sendrawtransaction", [hexstring])

    def test_mempool_accept(self, rawtxs: Sequence[str]) -> Any:
        return self._call("testmempoolaccept", [list(rawtxs)])

    def create_psbt(self, inputs: Sequence[Any], outputs: Any) -> Any:
        return self._call("createpsbt", [list(inputs), outputs])

    def decode_psbt(self, psbt: str) -> Any:
        return self._call("decodepsbt", [psbt])

    def analyze_psbt(self, psbt: str) -> Any:
        return self._call("analyzepsbt", [psbt])

    def combine_psbt(self, psbts: Sequence[str]) -> Any:
        return self._call("combinepsbt", [list(psbts)])

    def finalize_psbt(self, psbt: str, extract: bool = True) -> Any:
        return self._call("finalizepsbt", [psbt, extract])

    def wallet_create_funded_psbt(self, inputs: Sequence[Any], outputs: Any, locktime: int = 0,
                                  options: dict | None = None) -> Any:
        params: list[Any] = [list(inputs), outputs, locktime]
        if options is not None:
            params.append(options)
        return self._call("walletcreatefundedpsbt", params)

    def wallet_process_psbt(self, psbt: str) -> Any:
        return self._call("walletprocesspsbt", [psbt])

    def utxo_update_psbt(self, psbt: str) -> Any:
        return self._call("utxoupdatepsbt", [psbt])

    # ---- Mining ----
    def get_block_template(self, template_request: dict | None = None) -> Any:
        return self._call("getblocktemplate", [template_request] if template_request else [])

    def submit_block(self, hexdata: str) -> Any:
        return self._call("submitblock", [hexdata])

    def submit_header(self, hexdata: str) -> Any:
        return self._call("submitheader", [hexdata])

    def generate_to_address(self, nblocks: int, address: str, maxtries: int | None = None) -> Any:
        return self._call("generatetoaddress", [nblocks, address, maxtries] if maxtries is not None
                          else [nblocks, address])

    def generate_to_descriptor(self, num_blocks: int, descriptor: str) -> Any:
        return self._call("generatetodescriptor", [num_blocks, descriptor])

    def get_network_hash_ps(self, nblocks: int = 120, height: int = -1) -> Any:
        return self._call("getnetworkhashps", [nblocks, height])

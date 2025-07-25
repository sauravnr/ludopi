// server/utils/verifyPipDeposit.js
const axios = require("axios");

module.exports = async function verifyPipDeposit(txHash) {
  const apiKey = process.env.BSCSCAN_API_KEY;
  const depositAddress = process.env.PIP_DEPOSIT_ADDRESS;
  const tokenAddress = process.env.PIP_TOKEN_ADDRESS;
  if (!apiKey || !depositAddress || !tokenAddress) {
    throw new Error("Missing blockchain config");
  }
  const url = `https://api.bscscan.com/api?module=account&action=tokentx&txhash=${txHash}&apikey=${apiKey}`;
  const { data } = await axios.get(url);
  if (data.status !== "1" || !data.result || data.result.length === 0)
    return null;
  const tx = data.result[0];
  if (
    tx.to.toLowerCase() !== depositAddress.toLowerCase() ||
    tx.contractAddress.toLowerCase() !== tokenAddress.toLowerCase()
  ) {
    return null;
  }
  const decimals = Number(tx.tokenDecimal);
  const amount = Number(tx.value) / Math.pow(10, decimals);
  return amount;
};

import { readFileSync } from 'fs'
import solc from 'solc'
import { JsonRpcProvider, ContractFactory } from 'ethers'

const provider = new JsonRpcProvider('http://127.0.0.1:8545')

const signer = await provider.getSigner()
console.log('Address:', signer.address)

const balance = await provider.getBalance(signer.address)
console.log('Balance:', balance)

const network = await provider.getNetwork()
console.log('Chain ID:', network.chainId)

let latestBlock = await provider.getBlockNumber()
console.log('Current Block:', latestBlock)

const CONTRACT_FILE = './Storage.sol'

const content = readFileSync(CONTRACT_FILE).toString()

const input = {
  language: 'Solidity',
  sources: {
    [CONTRACT_FILE]: {
      content: content,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
}

const compiled = solc.compile(JSON.stringify(input))
const output = JSON.parse(compiled)

const abi = output.contracts[CONTRACT_FILE].Storage.abi
const bytecode = output.contracts[CONTRACT_FILE].Storage.evm.bytecode.object

const factory = new ContractFactory(abi, bytecode, signer)
const contract = await factory.deploy()

const deployTrx = contract.deploymentTransaction()
console.log('Deployment Tx Hash:', deployTrx.hash)

const trx = await contract.store('This message is stored using ethers.')
console.log('Storage Tx Hash:', trx.hash)

const message = await contract.retrieve()
console.log('Message:', message)

latestBlock = await provider.getBlockNumber()
console.log('Latest Block:', latestBlock)

// --- Gas estimation additions (appended; existing code unchanged) ---
try {
  // Minimal estimate for the specific store() call
  const gas = await provider.estimateGas({
    from: signer.address,
    to: contract.target,
    data: contract.interface.encodeFunctionData('store', ['This message is stored using ethers.']),
  })
  const feeData = await provider.getFeeData()
  const oneGwei = 1_000_000_000n
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? oneGwei
  const baseFee = feeData.lastBaseFeePerGas ?? (await provider.getBlock('latest'))?.baseFeePerGas ?? oneGwei
  const maxFeePerGas = feeData.maxFeePerGas ?? (baseFee + maxPriorityFeePerGas)
  console.log('Estimated gas (store):', gas.toString())
  console.log('Estimated max cost (wei):', (gas * maxFeePerGas).toString())
} catch (err) {
  console.error('Gas estimation failed:', err)
}
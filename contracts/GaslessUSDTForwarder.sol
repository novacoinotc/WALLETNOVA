// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
interface IERC20{function transferFrom(address from,address to,uint256 value) external returns(bool);function decimals() external view returns(uint8);}
contract GaslessUSDTForwarder{
 IERC20 public immutable USDT; address public feeVault; uint256 public flatFee; mapping(address=>uint256) public nonces;
 bytes32 private constant EIP712_DOMAIN_TYPEHASH=keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
 bytes32 private constant TRANSFER_TYPEHASH=keccak256("Transfer(address from,address to,uint256 amount,uint256 fee,uint256 nonce,uint256 deadline)");
 bytes32 private immutable _NAME_HASH=keccak256("GaslessUSDTForwarder"); bytes32 private immutable _VERSION_HASH=keccak256("1");
 event Executed(address indexed from,address indexed to,uint256 amount,uint256 fee,uint256 nonce);
 constructor(address usdt,address _feeVault,uint256 _flatFee){USDT=IERC20(usdt);feeVault=_feeVault;flatFee=_flatFee;}
 function domainSeparator() public view returns(bytes32){return keccak256(abi.encode(EIP712_DOMAIN_TYPEHASH,_NAME_HASH,_VERSION_HASH,block.chainid,address(this)));}
 function setFee(uint256 newFlatFee) external {require(msg.sender==feeVault,"only feeVault");flatFee=newFlatFee;}
 function setFeeVault(address newVault) external {require(msg.sender==feeVault,"only feeVault");feeVault=newVault;}
 function _hash(address from,address to,uint256 amount,uint256 fee,uint256 nonce,uint256 deadline) internal view returns(bytes32){
  bytes32 structHash=keccak256(abi.encode(TRANSFER_TYPEHASH,from,to,amount,fee,nonce,deadline));
  return keccak256(abi.encodePacked("\x19\x01",domainSeparator(),structHash));}
 function metaTransfer(address from,address to,uint256 amount,uint256 deadline,uint8 v,bytes32 r,bytes32 s) external {
  require(block.timestamp<=deadline,"expired"); uint256 nonce=nonces[from]++; uint256 fee=flatFee;
  bytes32 digest=_hash(from,to,amount,fee,nonce,deadline); address signer=ecrecover(digest,v,r,s); require(signer==from,"bad signature");
  _safeTransferFrom(USDT,from,to,amount); if(fee>0)_safeTransferFrom(USDT,from,feeVault,fee); emit Executed(from,to,amount,fee,nonce);
 }
 function _safeTransferFrom(IERC20 token,address f,address t,uint256 v) private {
  (bool ok,bytes memory data)=address(token).call(abi.encodeWithSelector(token.transferFrom.selector,f,t,v));
  require(ok&&(data.length==0||abi.decode(data,(bool))),"TRANSFER_FROM_FAILED");}
}

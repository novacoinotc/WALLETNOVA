// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;
interface IERC20 { function transferFrom(address from,address to,uint256 value) external returns (bool); }
contract GaslessUSDTForwarderSimple {
    IERC20 public immutable USDT;
    address public feeVault;
    uint256 public flatFee;
    mapping(bytes32=>bool) public used;
    event Executed(address indexed from,address indexed to,uint256 amount,uint256 fee,bytes32 digest);
    constructor(address usdt,address _feeVault,uint256 _flatFee){USDT=IERC20(usdt);feeVault=_feeVault;flatFee=_flatFee;}
    function setFee(uint256 newFlatFee) external { require(msg.sender==feeVault,'only feeVault'); flatFee=newFlatFee; }
    function setFeeVault(address newVault) external { require(msg.sender==feeVault,'only feeVault'); feeVault=newVault; }
    function _hash(address from,address to,uint256 amount,uint256 fee,uint256 deadline) internal view returns(bytes32){
        return keccak256(abi.encode(keccak256('FORWARDER_TX'),address(this),block.chainid,from,to,amount,fee,deadline)); }
    function metaTransfer(address from,address to,uint256 amount,uint256 deadline,uint8 v,bytes32 r,bytes32 s) external {
        require(block.timestamp<=deadline,'expired'); uint256 fee=flatFee; bytes32 digest=_hash(from,to,amount,fee,deadline); require(!used[digest],'used');
        address signer=ecrecover(digest,v,r,s); require(signer==from,'bad sig'); used[digest]=true;
        _safeTransferFrom(USDT,from,to,amount); if(fee>0)_safeTransferFrom(USDT,from,feeVault,fee); emit Executed(from,to,amount,fee,digest);
    }
    function _safeTransferFrom(IERC20 token,address f,address t,uint256 v) private {
        (bool ok,bytes memory data)=address(token).call(abi.encodeWithSelector(token.transferFrom.selector,f,t,v));
        require(ok&&(data.length==0||abi.decode(data,(bool))), 'TRANSFER_FROM_FAILED'); }
}

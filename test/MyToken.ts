import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

describe("My Token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  beforeEach("should deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
  });
  describe("Basic state value check", () => {
    it("should return name", async () => {
      expect(await myTokenC.name()).equal("MyToken");
    });
    it("should return symbol", async () => {
      expect(await myTokenC.symbol()).equal("MT");
    });
    it("should return decimals", async () => {
      expect(await myTokenC.decimals()).equal(18);
    });
    it("should return 100 totalSupply", async () => {
      expect(await myTokenC.totalSupply()).equal(
        MINTING_AMOUNT * 10n ** DECIMALS
      );
    });
  });

  describe("Mint", () => {
    it("should return 1MT balance for signer 0", async () => {
      const signer0 = signers[0];
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        MINTING_AMOUNT * 10n ** DECIMALS
      );
    });

    // signer0이 mint하는 테스트케이스
    it("should mint 1MT for signer 0", async () => {
      const signer0 = signers[0];
      const mintingAmount = hre.ethers.parseUnits("1", DECIMALS);
      await myTokenC.connect(signer0).mint(mintingAmount, signer0.address);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        MINTING_AMOUNT * 10n ** DECIMALS + mintingAmount
      );
    });

    it("should return or revert when minting infinitly", async () => {
      const hacker = signers[2];
      const mintingAgainAmount = hre.ethers.parseUnits("10000", DECIMALS);
      await expect(
        myTokenC.connect(hacker).mint(mintingAgainAmount, hacker.address)
      ).to.be.revertedWith("You are not authorized to manage this contract");
    });
  });

  describe("Transfer", () => {
    it("shoud have 0.5MT", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        await myTokenC.transfer(
          hre.ethers.parseUnits("0.5", 18),
          signer1.address
        )
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.5", DECIMALS)
        );
      expect(await myTokenC.balanceOf(signer1.address)).equals(
        hre.ethers.parseUnits("0.5", DECIMALS)
      );

      const filter = myTokenC.filters.Transfer(signer0.address);
      const logs = await myTokenC.queryFilter(filter, 0, "latest");
    });
    it("shoud be reverted with insufficient balance error", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits((MINTING_AMOUNT + 1n).toString(), DECIMALS),
          signer1.address
        )
      ).to.be.revertedWith("insufficient balance");
    });
  });

  describe("TransferFrom", () => {
    it("should emit Approval event", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.approve(signer1.address, hre.ethers.parseUnits("10", DECIMALS))
      )
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, hre.ethers.parseUnits("10", DECIMALS));
    });
    it("should be reverted with insufficient allowance error", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(
            signer0.address,
            signer1.address,
            hre.ethers.parseUnits("1", DECIMALS)
          )
      ).to.be.revertedWith("insufficient allowance");
    });
    it("should transferFrom properly after approve", async () => {
      // [Testcase 작성]
      // - 내용
      // 1. approve: signer1에게 signer0의 자산 이동권한 부여
      // 2. transferFrom: signer1이 signer0의 MT토큰을 자신의 주소(signer1)에게 전송
      // 3. balance 확인
      const signer0 = signers[0];
      const signer1 = signers[1];

      await myTokenC
        .connect(signer0)
        .approve(signer1.address, hre.ethers.parseUnits("1", DECIMALS));
      await myTokenC
        .connect(signer1)
        .transferFrom(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("1", DECIMALS)
        );

      let transferAmount = hre.ethers.parseUnits("1", DECIMALS);

      expect(await myTokenC.balanceOf(signer0.address)).equal(
        MINTING_AMOUNT * 10n ** DECIMALS - transferAmount
      );
      expect(await myTokenC.balanceOf(signer1.address)).equal(transferAmount);
    });
  });
});

import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { extendProvider } from "hardhat/config";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let tinyBankC: TinyBank;
  beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
    // 매니저 3명으로 설정.(0,1,2번 signer)
    const managers = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
    ];
    tinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
      signers[0].address,
      managers,
      3,
    ]);
    myTokenC.setManager(await tinyBankC.getAddress());
  });
  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await tinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });
  describe("Staking", async () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await tinyBankC.totalStaked()).equal(stakingAmount);
      expect(await myTokenC.balanceOf(tinyBankC)).equal(
        await tinyBankC.totalStaked()
      );
    });
  });
  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });
  describe("reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
      for (var i = 0; i < BLOCKS; i++)
        await myTokenC.transfer(transferAmount, signer0.address);

      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString())
      );
    });

    it("Should revert when changing rewardPerBlock by hacker", async () => {
      const hacker = signers[3];
      const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);
      await expect(
        tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("Not all managers confirmed yet");
      // MultiManagedAccess 수정으로 인해 메시지 변경
    });

    // 10주차 과제
    // 테스트 코드 완성 및 Github commit push
    //  - 테스트 코드에 console.log는 포함되어 있지 않을것
    //  - manager가 아닌 주소로부터 발생한 transaction은 "You are not a manager" 에러메시지 발생 (require 사용)
    //  - 모든 manager가 confirm하지 않은 상황에서는 "Not all managers confirmed yet" 에러메시지 발생(require 사용)

    // 총 3명의 매니저 중 1명만 confirm한 경우
    it("Should revert when not all managers confirmed(total 3, but only 1 confirmed)", async () => {
      const manager0 = signers[0];
      const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);

      await tinyBankC.connect(manager0).confirm();

      await expect(
        tinyBankC.connect(manager0).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("Not all managers confirmed yet");
    });

    // 총 3명의 매니저 모두 confirm한 경우
    it("Should allow changing rewardPerBlock after all managers confirm(total 3, all confirmed)", async () => {
      const rewardToChange = hre.ethers.parseUnits("500", DECIMALS);

      await tinyBankC.connect(signers[0]).confirm();
      await tinyBankC.connect(signers[1]).confirm();
      await tinyBankC.connect(signers[2]).confirm();

      await expect(
        tinyBankC.connect(signers[0]).setRewardPerBlock(rewardToChange)
      ).to.not.be.reverted;
    });

    // 매니저가 아닌 signer가 confirm 시도하는 경우
    it("Should revert when non-manager tries to confirm", async () => {
      const nonManager = signers[3];

      await expect(tinyBankC.connect(nonManager).confirm()).to.be.revertedWith(
        "You are not one of managers"
      );
    });
  });
});

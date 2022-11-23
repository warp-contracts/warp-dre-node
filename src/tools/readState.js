const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");
const {getArweave} = require("../config");

async function readState() {


  const wallet = await getArweave().wallets.generate();

  console.log(wallet);

  {
    "kty": "RSA",
      "n": "-AjkEUW4omvGbzO0YYpoz02VMZXpgh-xmcESQKL0LHkh8QgnEN5BVwPfXLc729cSJdro9GWzj_Xq_y03VD6NncDg9fqqcSzA_cbEevPNA5Lx3RP_y610Z5wOqxEZOM-LhCKbwaFhmRI9-0GAtNqf7gJQOEGiNpSz8bBY-wm0gRD0NjQUmXv9hiU6Ce3EH9RgJ_WgLZEyaOD4OyZdRdVMue6aCLy7_mFGZ7I03fTHWVYfk-Gq3_uZAebq-bAkmvJu5Drfu_uFEldwUN_jJL4YAxR8nIwZbKftcdv3RkYGTmP73W04PeTt2GxvwMww_GXgv2IZtX5uaeILqfRElUhmadqVSGgxcl06vLRA5SGULRaPU2LbHqiHpbQm_IxiE9Asr7NFsgVI2QvzNEoYA79vdv_qhUpaTwQXVcvGiiFwaYN7Si2chM7zNYemCkKHT5VaNtwSPfH_ViyWZWwTG1dEG9g4G9HfbTHFDbStZiyz-7GzV2WdjVErfKj1qUFq6gDfcFlkpHQFsWnMkW1EytA55oUOFgvuV46dgVhQIIUkDWShvZtLj1v5oobgqo_cHyGv4zIPCBvv2saM3OvBuCmcfaCSde0hwWS5wzRSNQuh8v7iXN65fjDB5ya27I1F91OOaLwvzwzkSpsmfUVWvFg09VOsPEDg-ZcpcQfhh0qXMXs",
    "e": "AQAB",
    "d": "CjQTbcJ4ffYBC8IMwZZ4CU8fvBJ2sKutGq4emhoaAVpaUxgKw17hQTsfjSjchYarcHM48hTc9icfq6-ofwazvLGaj4PoTw-QQOBUZNpyrJr26ClSdIaGK1z4HYFukC-5hY4G6khBQ5LEifl_2fDEc34U3ruUeLpVTLP8dRdJHaYc5b3uuwGmxEXzxUTKtKR_8CTimf1HHZljnMtPOvgzV9LA82sQML6_rrReCGNxb_NjCSpXZS9sc--T6wGb_-PJPApP-eO27bI7JJiRN4m6YyYMmkQJJ7cgxXZPDc0DpWXnjoxXq_Qm9KhBUKUVvsxSGo1mkVjKIgDyieNKjvmTfOKNfvwGtYXOw6g8-cJEESeqGuXHx69uUveyot8XpNUAP84_E2yyDCUcW-qV2va39xPrLRRyKePUbmN9o9CY1XD93BxOqOawgg7OwAvdY9EwzTEZZ2dGtIR-YUJ7Ltkde-AdpbgTSECxFDFVxbrA6ud7XnlA3LIbcv_DVFn9vCjeO0o36Py_KTFIDrSR5I2oImiYF2TEyP91KOxRo6Vt4L3XBLx9UmNAVllXW4x9hMleHBUdju956rZBeJtiqf4kOEldIupi7LrOu7JdBmfwLbuiJDg8dxs--90YdHNq77ghAjQAJr298pLGqIiAysKYCnvn4b0ZQzzBY_4R6IMlqIE",
    "p": "_a8vLcSb4XO76et6eqls4Nwnaptgn5H79DBLOjzozZ1aDJPV7IH4jl0AEFvDxMuuYiRu3Vy9ayb6USeXQ25Ymyx_ehKtYc2nsxD_b-tsTfVCFawNMU97bUF-yZthaVi2zfgIs1ypASaiVN7LMknP65IBFs4spmI4NgGGKmVYTPpm0nt8LMV6OSn_tKwHHEe2p_UW7miUFPrG4p3GvYO0O-YDNMUDAleXQ8LZdIds1zvwlPiAJIZ7-ZRsEtbMa5YkOBb0DG4f7F51mtj2U1S3fvNlsUJSOx-28Qtj7f2zIIOLcmw2Gnye0YGsByjSTWjyLRp1SE3fHLUZEjkGiWJ0iQ",
    "q": "-kyBJ6cu7tYOjwV24Ns7rWoArk8tBJc9TwEVbgNe_AAQqplkeX3fDRyQPh_--ZoeFlfYK7ujQn-4KbdSv_DHzu0SqWZnQDGjKlhhLH2IQaNmioVJwaBNJl4635O09p-3Tzu48BPTw90BjfVvoOe8EX-6JFVFCbpZaf8kGp8xXE7-FvBzCncbCoi-GcY8h3EKkmpHlGPKqy_8aIoXx3tMpttjd81NPslkvaMMwNT0fFB8kASstgBU6K4ai-IN2YqtMsrdFJAC635jhmn6o-z6kWrNK-GVk9IhY5knx5oClDUu2qHpq1AXlqF27MWIfHo_jCMXx6wjyEIi1fPXojv84w",
    "dp": "tFXgd-yX00DuiG849hGSsJZP_tzNZyHjtcbO82txIxmEdgRxwlryUmGSNg7FsBQKtwGnPf07OfzPXPmD8g9zNXwAcsrsLeaAHC8tJmZ460I55CYWisMxvo0ckDzAlp7V9L0pkjeAfKz2INbwI6ONBq0X0Rpnay_PPbT_pwu8JZyrk1zs_Pa02AYfHFReCaCBHAyCbKAzBGbxEw-NxBLoANyV0uFqLjQN98F_y_KpUKfvcjblARII93anDQ1c6-4jeSv3-Q4f62uKtrUdBkfm2Xw1AjlfM2BsMBYkx33d5HMeogyCuXl1fQFtRPmj5huAbMeuL-QLguDKHcYj-23d4Q",
    "dq": "0BHpC92e1kx7rckNGb8lzPLhvgVzlu1iudpcxidnPnWPZUI-lABe-7dS8VIH09aaTFiaC0DgZtdlcMhEseqnLw1FBi1qh6K70OfHYAS60FXVWDGVLrDjcZHDvzg6pwn-iI9NHcZds-R09l2hflEltiZHxwxbZ8rRqZu_l6Helq3T653XBEwe3pLt9N8mUjFWaICRIHoUcFpjqUOioOGOxuZ5uY2hOSCR7lMstuBQnUcLRW2dZW7BJuwUhVRVzxHJCQA66G0PAFUAxywyfzLw2RG_nUrZ3RhBSVp4ByWwHyRW3sjaRt89vKpdAlbzLwcw7H3_tq0S0daovtMF3oefoQ",
    "qi": "gnEObcFF4PwU5gb9EiLcdrBwU6jwybjtsKPY5PCS7__lA_xeFL3NUUpVIQ1aIGmpHAGatDlXJSSKT3Z_jekjpyGCFYv8eNJphJSyhiY2L_ZXb_kolN9vTKxDb1NKyI08Y--3-Pe0mm6lRGRKtWQJkM_jJPudNOuQ7rTtM-9975lMxeaUf9FZYJTBltpFQT2lHZXGeE0SAz9kqXURdiiNX80pqRAM-okQTD2gTLIiPGbb2YZ93CGX2dW3sOPsZ16rDAOv0QAonBf8TcoS6Y4tECDeXwKjIz-HXBcH6mM__N4pYEIU23Hsj7KudarNInAKBkgsldrag426-2quG41VOg"
  }

  /*const warp = WarpFactory.forMainnet()
    .useStateCache(new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/state`
    }))
    .useContractCache(new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/contract`
    }));

  warp.contract("Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY")
    .setEvaluationOptions({
      allowBigInt: true,
    })
    .readState().finally(() => {
      console.log("done");
    }
  );*/
}


readState().finally();
import "./style.css";
import WcSdk, { Version } from "@cityofzion/wallet-connect-sdk-core";
import SignClient from "@walletconnect/sign-client";

let wcSdk;
const adminConfig = {
    address: import.meta.env.VITE_WALLET_ADDRESS,
    privateKey: import.meta.env.VITE_PRIVATE_KEY,
};

const config = {
    WalletConnect: {
        projectId: "a9ff54e3d56a52230ed8767db4d4a810",
        relayURL: "wss://relay.walletconnect.com",
    },
    Neo: {
        contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
        usdtAddress: import.meta.env.VITE_USDT_ADDRESS,
    },
};

const init = async () => {
    registerInteraction();
    console.log(config);
    const { projectId, relayURL } = config.WalletConnect;

    // start the sdk
    wcSdk = new WcSdk(
        await SignClient.init({
            projectId: projectId, // the ID of your project on Wallet Connect website
            relayUrl: relayURL, // we are using walletconnect's official relay server
            metadata: {
                name: "MyApplicationName", // your application name to be displayed on the wallet
                description: "My Application description", // description to be shown on the wallet
                url: "https://myapplicationdescription.app/", // url to be linked on the wallet
                icons: ["https://myapplicationdescription.app/myappicon.png"], // icon to be shown on the wallet
            },
        })
    );

    // reload the session if there is one and automatically disconnect upon wallet request
    await wcSdk.manageSession();

    if (wcSdk.isConnected()) {
        renderAfterConnect();
    }
};

const connect = async () => {
    // connect to the wallet with the specified network and ask authotization for the specified methods
    wcSdk
        .connect("neo3:testnet", [
            "invokeFunction",
            "testInvoke",
            "signMessage",
            "verifyMessage",
            "traverseIterator",
            "getWalletInfo",
            "getNetworkVersion",
        ])
        .then(() => {
            renderAfterConnect();
        })
        .catch((err) => console.log(err));
};

const disconnect = async () => {
    // disconnect from the wallet
    await wcSdk.disconnect();
    renderAfterDisconnect();
};

// Get all contract methods/ events of contract through this link:
// https://dora.coz.io/contract/neo3/testnet/0x0baa6896b612c35f5889a945807d644fc922b597
// Or can see through manifest file in abi

const getBalance = async () => {
    const { usdtAddress } = config.Neo;
    const resp = await wcSdk.invokeFunction({
        invocations: [
            {
                scriptHash: usdtAddress,
                operation: "balanceOf",
                args: [
                    {
                        type: "Hash160",
                        value: wcSdk.getAccountAddress() ?? "",
                    },
                ],
            },
        ],
        signers: [{ scropes: "Global" }],
    });
    console.log(resp);
};

const transferNeo = async () => {
    // `invokeFunction` is used to invoke a smart contract function persisting the changes on the blockchain
    const { contractAddress } = config.Neo;
    const { address } = adminConfig;
    const resp = await wcSdk.invokeFunction({
        invocations: [
            {
                scriptHash: contractAddress,
                operation: "Transfer Token",
                args: [
                    { type: "Hash160", value: wcSdk.getAccountAddress() ?? "" },
                    {
                        type: "Hash160",
                        value: address,
                    },
                    { type: "Integer", value: 10 },
                ],
            },
        ],
        signers: [{ scopes: "Global" }],
    });

    console.log(resp);
    window.alert(JSON.stringify(resp, null, 2));
};

const multiInvokeFailing = async () => {
    const { contractAddress } = config.Neo;
    const { address } = adminConfig;
    // on this example, the first invocation will fail and the second one will not be executed
    const resp = await wcSdk.invokeFunction({
        invocations: [
            {
                scriptHash: "0x010101c0775af568185025b0ce43cfaa9b990a2a", // invalid contract address, just to be fail in call multiInvoke
                operation: "verify",
                args: [],
                abortOnFail: true, // the whole transaction will be aborted if this invocation fails
            },
            {
                scriptHash: contractAddress,
                operation: "Transfer Token",
                args: [
                    { type: "Hash160", value: wcSdk.getAccountAddress() ?? "" },
                    {
                        type: "Hash160",
                        value: address,
                    },
                    { type: "Integer", value: 2 },
                    { type: "Array", value: [] },
                ],
                abortOnFail: true,
            },
        ],
        signers: [{ scopes: "Global" }],
    });

    console.log(resp);
    window.alert(JSON.stringify(resp, null, 2));
};

const signAndVerify = async () => {
    if (!wcSdk) return;
    const resp = await wcSdk.signMessage({
        message: "Carai, muleq, o baguiu eh issumermo taix ligads na missaum?",
        version: Version.DEFAULT,
    });

    console.log(resp);
    window.alert(JSON.stringify(resp, null, 2));

    const resp2 = await wcSdk.verifyMessage(resp);

    console.log(resp2);
    window.alert(JSON.stringify(resp2, null, 2));
};

const signWithoutSaltAndVerify = async () => {
    if (!wcSdk) return;
    const resp = await wcSdk.signMessage({
        message: "Carai, muleq, o baguiu eh issumermo taix ligads na missaum?",
        version: Version.WITHOUT_SALT,
    });

    console.log(resp);
    window.alert(JSON.stringify(resp, null, 2));

    const resp2 = await wcSdk.verifyMessage(resp);

    console.log(resp2);
    window.alert(JSON.stringify(resp2, null, 2));
};

const verifyFailling = async () => {
    // get data, messageHex, publickey, salt by response from wsSdk.signMessage
    const resp2 = await wcSdk.verifyMessage({
        data: "4fe1b478cf76564b2133bdff9ba97d8a360ce36d0511918931cda207c2ce589dfc07ec5d8b93ce7c3b70fc88b676cc9e08f9811bf0d5b5710a20f10c58191bfb",
        messageHex:
            "010001f05c3733336365623464346538666664633833656363366533356334343938393939436172616c686f2c206d756c65712c206f2062616775697520656820697373756d65726d6f2074616978206c696761646f206e61206d697373e36f3f0000",
        publicKey:
            "031757edb62014dea820a0b33a156f6a59fc12bd966202f0e49357c81f26f5de34",
        salt: "733ceb4d4e8ffdc83ecc6e35c4498999",
    });

    console.log(resp2);
    window.alert(JSON.stringify(resp2, null, 2));
};

const verify = async () => {
    // get data, messageHex, publickey, salt by response from wsSdk.signMessage
    const resp2 = await wcSdk.verifyMessage({
        publicKey:
            "031757edb62014dea820a0b33a156f6a59fc12bd966202f0e49357c81f26f5de34",
        data: "aeb234ed1639e9fcc95a102633b1c70ca9f9b97e9592cc74bfc40cbc7fefdb19ae8c6b49ebd410dbcbeec6b5906e503d528e34cd5098cc7929dbcbbaf23c5d77",
        salt: "052a55a8d56b73b342a8e41da3050b09",
        messageHex:
            "010001f0a0303532613535613864353662373362333432613865343164613330353062303965794a68624763694f694a49557a49314e694973496e523563434936496b705856434a392e65794a6c654841694f6a45324e444d304e7a63324e6a4d73496d6c68644349364d5459304d7a4d354d5449324d33302e7253315f73735230364c426778744831504862774c306d7a6557563950686d5448477a324849524f4a4f340000",
    });

    console.log(resp2);
    window.alert(JSON.stringify(resp2, null, 2));
};
const getWalletInfo = async () => {
    const resp = await wcSdk.getWalletInfo();

    console.log(resp);
    window.alert(JSON.stringify(resp, null, 2));
};

const registerInteraction = () => {
    document.getElementById("connect").addEventListener("click", connect);
    document.getElementById("disconnect").addEventListener("click", disconnect);
    document
        .getElementById("transferNeo")
        .addEventListener("click", transferNeo);
    document
        .getElementById("multiInvokeFailing")
        .addEventListener("click", multiInvokeFailing);
    document
        .getElementById("signAndVerify")
        .addEventListener("click", signAndVerify);
    document
        .getElementById("signWithoutSaltAndVerify")
        .addEventListener("click", signWithoutSaltAndVerify);
    document
        .getElementById("verifyFailling")
        .addEventListener("click", verifyFailling);
    document.getElementById("verify").addEventListener("click", verify);
    document
        .getElementById("getWalletInfo")
        .addEventListener("click", getWalletInfo);
};

const renderAfterConnect = () => {
    document.getElementById("afterConnect").style.display = "block";
    document.getElementById("connect").style.display = "none";
    document.getElementById("address").innerHTML = wcSdk.getAccountAddress();
};

const renderAfterDisconnect = () => {
    document.getElementById("afterConnect").style.display = "none";
    document.getElementById("connect").style.display = "block";
    document.getElementById("address").innerHTML = "";
};

init();

import { useEffect, useRef, useState } from 'react';
import './App.css';
import Web3Modal from 'web3modal'
import { Contract, providers } from 'ethers'
import { NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS, DAO_CONTRACT_ABI, DAO_CONTRACT_ADDRESS, FAKE_NFT_MARKETPLACE_CONTRACT_ABI, FAKE_NFT_MARKETPLACE_CONTRACT_ADDRESS } from './constants/index'

function App() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [nftBalance, setNftBalance] = useState(0)
  const [treasuryBalance, setTreasuryBalance] = useState(0)
  const [numProposals, setNumProposals] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nftTokenId, setNftTokenId] = useState("")
  const [Proposals, setProposals] = useState([])
  const [proposalId, setProposalId] = useState("")
  const [selectedTab, setSelectedTab] = useState("");

  const web3ModalRef = useRef()

  const getDAOTreasurerBalance = async () =>{
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        DAO_CONTRACT_ADDRESS
      )
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  }
  const getUserNFTBalance  = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      );

      const balance = await nftContract.balanceOf(signer.getAddress())
      setNftBalance(parseInt(balance.toString()))
    } catch (error) {
      console.error(error);
    }
   
  }
  const getNumProposal = async() => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        provider
      )
      const proposals = await daoContract.numProposals();
      setNumProposals(proposals.toString())
    } catch (error) {
      console.error(error);
    }
  }

  const getDAOowner = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        signer,
      )
      const owner = await daoContract.owner();
      const address = await signer.getAddress();
      if(owner.toLowerCase() === address.toLowerCase())
        setIsOwner(true)
      
    } catch (error) {
      console.error(error);
    }
  }

  const withdrawEth = async() => {
    try {
      const signer = await getProviderOrSigner(true)
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ADDRESS,
        signer
      )
      const tx = await daoContract.withdraw();
      setLoading(true)
      await tx.wait();
      await getDAOTreasurerBalance()
      setLoading(false)
    } catch (error) {
      console.error(error);
    }
  }

  const createProposal = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        signer
      )
      const proposal = await daoContract.createProposal(nftTokenId);
      setLoading(true);
      await proposal.wait();
      await getNumProposal()
      setLoading(false)
    } catch (error) {
      console.error(error);
    }
  }

  const getProposalById = async(id) => {
    try {
      const provider = await getProviderOrSigner()
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        provider
      )
      const proposal = await daoContract.proposals(id)
      const parsedProposal = {
        proposalId : id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      }
      return parsedProposal;

    } catch (error) {
      console.error(error);
    }
  }

  const getAllPropsal = async() => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await getProposalById(i)
        proposals.push(proposal)
      }
      setProposals(proposals)
    } catch (error) {
      console.error(error);
    }
  }

  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        signer
        )
        let vote = _vote === "YAY" ? 0 : 1;
        const txn = await daoContract.voteOnProposal(proposalId, vote);
        setLoading(true);
        await txn.wait();
        await getAllPropsal();
        setLoading(false);
      } 
      catch (error) {
        console.error(error);
        window.alert(error.reason);
    }
  }

  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        signer
        )
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await getAllPropsal();
      await getDAOTreasurerBalance();
    } catch (error) {
      console.error(error);
      window.alert(error.reason);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider)

    const { chainId } = await web3Provider.getNetwork()
    if(chainId !== 5){
      alert("Change the network to goerli")
      throw new Error("Change network to goerli")
    }
    if(needSigner){
      const signer = web3Provider.getSigner()
      return signer;
    }
    return web3Provider;
  }

  const connectWallet = async() => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      })

      connectWallet().then(()=>{
        getUserNFTBalance()
        getDAOTreasurerBalance()
        getNumProposal()
        getDAOowner()
        getAllPropsal()
      })
    }
  }, [walletConnected])

  useEffect(() => {
    if (selectedTab === "View Proposals") {
      getAllPropsal();
    }
  }, [selectedTab]);
  
  const renderTabs = () => {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  const renderCreateProposalTab = () => {
    if (loading) {
      return <div className="description">Loading... Waiting for transaction...</div>
    } 
    else if (nftBalance === 0) {
      return  <div className="description">You do not own any CryptoDevs NFTs. <br /> <b>You cannot create or vote on proposals</b></div>
    } 
    else {
      return  <div className="container"><label>Fake NFT Token ID to Purchase: </label>
          <input placeholder="0" type="number" onChange={(e) => setNftTokenId(e.target.value)}/>
          <button className="button2" onClick={createProposal}>Create</button>
        </div>
    }
  }

  function renderViewProposalsTab() {
    if (loading) {
      return <div className="description">Loading... Waiting for transaction...</div>
    } 
    else if (Proposals.length === 0) {
      return <div className="description">No proposals have been created</div>
    } 
    else {
      return <div>
          {Proposals.map((p, index) => (
            <div key={index} className="proposalCard">
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className="flex">
                  <button className="button2" onClick={() => voteOnProposal(p.proposalId, "YAY")}>Vote YAY</button>
                  <button className="button2" onClick={() => voteOnProposal(p.proposalId, "NAY")}>Vote NAY</button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className="flex">
                  <button className="button2" onClick={() => executeProposal(p.proposalId)} >Execute Proposal{" "}{p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}</button>
                </div>
              ) : (
                <div className="description">Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
    }
  }


  return (
    <div className='main'>
      <div>
        <h1 className='heading'>Welcome to Crypto Devs</h1>
        <div className='description'>Welcome to the DAO </div>
        <div className='description'>Your CryptoDevs Nft balance is {nftBalance} ETH
          <br />
            Treasury balanace is {treasuryBalance} ETH
          <br />
            Total number of proposals {numProposals}
         </div>
         <div className="flex">
            <button className="button" onClick={() => setSelectedTab("Create Proposal")}> Create Proposal</button>
            <button className="button" onClick={() => setSelectedTab("View Proposals")}> View Proposals</button>
          </div>
          {renderTabs()}
          {/* Display additional withdraw button if connected wallet is owner */}
          {isOwner ? (
            <div>
            {loading ? <button className="button">Loading...</button>
                     : <button className="button" onClick={withdrawEth}> Withdraw DAO ETH </button>
            }
            </div>
            ) : ("")
          }
      </div>

      <div>
          <img src="" alt="image" />
      </div>
    </div>
  );
}

export default App;

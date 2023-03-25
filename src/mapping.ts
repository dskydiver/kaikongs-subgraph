import { Address, BigInt, ipfs, json } from "@graphprotocol/graph-ts";
import {
  ListedNFT as ListedNFTEvent,
  BoughtNFT as BoughtNFTEvent,
  OfferredNFT as OfferredNFTEvent,
  CanceledOfferredNFT as CanceledOfferredNFTEvent,
  AcceptedNFT as AcceptedNFTEvent,
  CreatedAuction as CreatedActionEvent,
  PlacedBid as PlacedBitEvent,
  ResultedAuction as ResultedAuctionEvent,
  OfferredNFT,
} from "../generated/Marketplace/Marketplace";
import { CreatedNFTCollection as CreatedNFTCollectionEvent } from "../generated/Factory/Factory";
import { Collection } from "../generated/Factory/Collection";

import {
  NFT,
  User,
  NFTCollection,
  ListNFT,
  AuctionNFT,
  OfferNFT,
} from "../generated/schema";

export function handleCreatedNFTCollection(
  event: CreatedNFTCollectionEvent
): void {
  // load the collection from the existing graph node
  let collection = NFTCollection.load(event.params.nft.toString());
  if (!collection) {
    // make new collection
    collection = new NFTCollection(event.params.nft.toString());
    let collectionInastance = Collection.bind(event.params.nft);
    let name = collectionInastance.try_name();
    let symbol = collectionInastance.try_symbol();
    let maxSupply = collectionInastance.try_maxSupply();
    let baseURI = collectionInastance.try_baseURI();
    let mintPrice = collectionInastance.try_mintPrice();
    let royaltyFee = collectionInastance.try_getRoyaltyFee();
    let royaltyRecipient = collectionInastance.try_getRoyaltyRecipient();

    collection.name = name.reverted ? "" : name.value;
    collection.symbol = symbol.reverted ? "" : symbol.value;
    collection.address = event.params.nft.toString();
    collection.maxSupply = maxSupply.reverted ? new BigInt(0) : maxSupply.value;
    collection.baseURI = baseURI.reverted ? "" : baseURI.value;
    collection.mintPrice = mintPrice.reverted ? new BigInt(0) : mintPrice.value;
    collection.royaltyFee = royaltyFee.reverted
      ? new BigInt(0)
      : royaltyFee.value;
    collection.royaltyRecipient = royaltyRecipient.reverted
      ? ""
      : royaltyRecipient.value.toString();
    collection.creator = event.params.creator.toString();

    let creator = User.load(event.params.creator.toString());
    if (!creator) {
      creator = new User(event.params.creator.toString());
    }
    creator.save();

    if (!royaltyRecipient.reverted) {
      let royaltyRecipientUser = User.load(royaltyRecipient.value.toString());
      if (!royaltyRecipientUser) {
        royaltyRecipientUser = new User(royaltyRecipient.value.toString());
      }
      royaltyRecipientUser.save();
    }
  }
  collection.save();
}

export function handleListedNFT(event: ListedNFTEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())
  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }

  let listNFT = ListNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  if (!listNFT) {
    listNFT = new ListNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  }

  let seller = User.load(event.params.seller.toString())
  if (!seller) {
    seller = new User(event.params.seller.toString())
  }

  listNFT.nft = nft.id
  listNFT.seller = seller.id
  listNFT.price = event.params.price
  listNFT.sold = false

  listNFT.save()
}

export function handleBoughtNFT(event: BoughtNFTEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())
  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }

  nft.owner = event.params.buyer.toString()
  nft.save()

  let listNFT = ListNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  if (!listNFT) {
    listNFT = new ListNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  }

  let seller = User.load(event.params.seller.toString())
  if (!seller) {
    seller = new User(event.params.seller.toString())
  }

  listNFT.nft = nft.id
  listNFT.seller = seller.id
  listNFT.price = event.params.price
  listNFT.sold = true

  listNFT.save()
}

export function handleOfferredNFT(event: OfferredNFTEvent | CanceledOfferredNFTEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())
  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }

  let offerNFT = OfferNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString() + '-' + event.params.offerer.toString())
  if (!offerNFT) {
    offerNFT = new OfferNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString() + '-' + event.params.offerer.toString())
  }

  offerNFT.nft = nft.id
  offerNFT.offerer = event.params.offerer.toString()
  offerNFT.offerPrice = event.params.offerPrice
  offerNFT.accepted = false

  offerNFT.save()
}

export function handleAcceptedNFT(event: AcceptedNFTEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())
  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }
  
  let offerNFT = OfferNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString() + '-' + event.params.offerer.toString())
  if (!offerNFT) {
    offerNFT = new OfferNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString() + '-' + event.params.offerer.toString())
  }

  offerNFT.nft = nft.id
  offerNFT.offerer = event.params.offerer.toString()
  offerNFT.offerPrice = event.params.offerPrice
  offerNFT.accepted = true
  
  offerNFT.save()
}

export function handleCreatedAuction(event: CreatedActionEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())
  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }
  
  let auctionNFT = AuctionNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  if (!auctionNFT) {
    auctionNFT = new AuctionNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  }

  let creator = User.load(event.params.creator.toString())
  if (!creator) {
    creator = new User(event.params.creator.toString())
  }

  auctionNFT.nft = nft.id
  auctionNFT.creator = creator.id
  auctionNFT.initialPrice = event.params.price
  auctionNFT.minBid = event.params.minBid
  auctionNFT.startTime = event.params.startTime
  auctionNFT.endTime = event.params.endTime
  auctionNFT.initialPrice = event.params.price
  auctionNFT.success = false

  auctionNFT.save()
}

export function handlePlacedBid(event: PlacedBitEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())
  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }

  let auctionNFT = AuctionNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  if (!auctionNFT) {
    auctionNFT = new AuctionNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())

  }
  auctionNFT.nft = nft.id
  auctionNFT.creator = nft.owner
  auctionNFT.lastBidder = event.params.bidder.toString()
  auctionNFT.heighestBid = auctionNFT.heighestBid === null || event.params.bidPrice > auctionNFT.heighestBid ? event.params.bidPrice : auctionNFT.heighestBid
  auctionNFT.success = false

  auctionNFT.save()
}

export function handleResultedAuction(event: ResultedAuctionEvent) {
  let nft = NFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  let collection = NFTCollection.load(event.params.nft.toString())

  if (!collection) {
    collection = new NFTCollection(event.params.nft.toString())
    collection.address = event.params.nft.toString()
    collection.save()
  }
  if (!nft) {
    nft = new NFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())
    nft.tokenID = event.params.tokenId
    nft.collection = collection.id
    
    let collectionInastance = Collection.bind(event.params.nft);
    let ownerOfToken = collectionInastance.try_ownerOf(event.params.tokenId)

    nft.owner = ownerOfToken.reverted ? '' : ownerOfToken.value.toString()
    nft.save()
  }

  let auctionNFT = AuctionNFT.load(event.params.nft.toString() + '-' + event.params.tokenId.toString())
  if (!auctionNFT) {
    auctionNFT = new AuctionNFT(event.params.nft.toString() + '-' + event.params.tokenId.toString())

  }

  let creator = User.load(event.params.creator.toString())
  if (!creator) {
    creator = new User(event.params.creator.toString())
  }

  let winner = User.load(event.params.winner.toString())
  if (!winner) {
    winner = new User(event.params.winner.toString())
  }

  auctionNFT.nft = nft.id
  auctionNFT.creator = creator.id
  auctionNFT.winner = winner.id
  auctionNFT.success = true

  auctionNFT.save()
}

import { BigInt, ipfs, json } from "@graphprotocol/graph-ts";
import {
  ListedNFT as ListedNFTEvent,
  BoughtNFT as BoughtNFTEvent,
  OfferredNFT as OfferredNFTEvent,
  CanceledOfferredNFT as CanceledOfferredNFTEvent,
  AcceptedNFT as AcceptedNFTEvent,
  CreatedAuction as CreatedActionEvent,
  PlacedBid as PlacedBitEvent,
  ResultedAuction as ResultedAuctionEvent,
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

import {
  BigInt,
  ipfs,
  json,
  dataSource,
  Bytes,
  ByteArray,
  store,
  Address,
  log,
} from "@graphprotocol/graph-ts";
import {
  ListedNFT as ListedNFTEvent,
  BoughtNFT as BoughtNFTEvent,
  OfferredNFT as OfferredNFTEvent,
  CanceledOfferredNFT as CanceledOfferredNFTEvent,
  AcceptedNFT as AcceptedNFTEvent,
  CreatedAuction as CreatedActionEvent,
  PlacedBid as PlacedBitEvent,
  ResultedAuction as ResultedAuctionEvent,
  Marketplace,
  ListedNFT,
} from "../generated/Marketplace/Marketplace";
import { CreatedNFTCollection as CreatedNFTCollectionEvent } from "../generated/Factory/Factory";
import { Collection } from "../generated/Factory/Collection";
import { Transfer as TransferEvent } from "../generated/templates/Collection/Collection";
import {
  NFT,
  User,
  NFTCollection,
  ListNFT,
  BuyNFT,
  AuctionNFT,
  OfferNFT,
  Attribute,
} from "../generated/schema";

import { Collection as KaiCollection } from "../generated/templates";

export function handleCreatedNFTCollection(
  event: CreatedNFTCollectionEvent
): void {
  KaiCollection.create(event.params.nft);

  let collection = new NFTCollection(event.params.nft.toHexString());
  let collectionInastance = Collection.bind(event.params.nft);
  let name = collectionInastance.try_name();
  let symbol = collectionInastance.try_symbol();
  let maxSupply = collectionInastance.try_maxSupply();
  let baseURI = collectionInastance.try_baseURI();
  let mintPrice = collectionInastance.try_mintPrice();
  let royaltyFee = collectionInastance.try_getRoyaltyFee();
  let royaltyRecipient = collectionInastance.try_getRoyaltyRecipient();

  collection.name = name.reverted ? null : name.value;
  collection.symbol = symbol.reverted ? null : symbol.value;
  collection.address = event.params.nft.toHexString();
  collection.maxSupply = maxSupply.reverted ? new BigInt(0) : maxSupply.value;
  collection.baseURI = baseURI.reverted ? null : baseURI.value;
  collection.mintPrice = mintPrice.reverted ? new BigInt(0) : mintPrice.value;
  collection.royaltyFee = royaltyFee.reverted ? null : royaltyFee.value;
  collection.royaltyRecipient = royaltyRecipient.reverted
    ? null
    : royaltyRecipient.value.toHexString();
  collection.creator = event.params.creator.toHexString();

  let creator = new User(event.params.creator.toHexString());
  creator.address = event.params.creator.toHexString();
  creator.save();

  if (!royaltyRecipient.reverted) {
    let royaltyRecipientUser = new User(royaltyRecipient.value.toHexString());
    royaltyRecipientUser.save();
  }
  collection.save();
}

export function handleTransfer(event: TransferEvent): void {
  let nft = new NFT(
    generateId([
      dataSource.address().toHexString(),
      event.params.tokenId.toString(),
    ])
  );
  if (event.params.to !== Address.zero()) {
    let to = new User(event.params.to.toHexString());
    to.address = event.params.to.toHexString();
    to.save();
    let contract = Collection.bind(dataSource.address());
    nft.tokenID = event.params.tokenId;
    nft.collection = dataSource.address().toHexString();
    let tokenURI = contract.try_tokenURI(event.params.tokenId);
    if (!tokenURI.reverted) {
      nft.tokenURI = tokenURI.value;
      let hash = tokenURI.value.slice(7);
      let data = ipfs.cat(hash);
      if (data) {
        const value = json.fromBytes(data).toObject();
        if (value) {
          let image = value.get("image");
          let name = value.get("name");
          let description = value.get("description");
          let dna = value.get("dna");
          let edition = value.get("edition");
          let date = value.get("date");
          let compiler = value.get("compiler");
          if (image) nft.image = image.toString();
          if (name) nft.name = name.toString();
          if (description) nft.description = description.toString();
          if (dna) nft.dna = dna.toString();
          if (edition) nft.edition = edition.toBigInt();
          if (date) nft.date = date.toBigInt();
          if (compiler) nft.compiler = compiler.toString();
          const attribs = value.get("attributes");
          if (attribs) {
            let attributes = [""];
            for (let index = 0; index < attribs.toArray().length; index++) {
              let attrib = attribs.toArray()[index];
              let traitType = attrib.toObject().get("trait_type");
              let value = attrib.toObject().get("value");
              if (traitType && value) {
                let attribute = new Attribute(
                  generateId([traitType.toString(), value.toString()])
                );
                attribute.traitType = traitType.toString();
                attribute.value = value.toString();
                attribute.save();
                attributes.push(attribute.id);
              }
            }
            if (attributes.length !== 0) {
              nft.attributes = attributes;
            }
          }
        }
      }
    }
    nft.owner = to.id;
  }
  nft.save();
}

export function handleListedNFT(event: ListedNFTEvent): void {
  let nft = NFT.load(
    generateId([
      event.params.nft.toHexString(),
      event.params.tokenId.toString(),
    ])
  );

  let seller = new User(event.params.seller.toHexString());
  seller.address = event.params.seller.toHexString();
  seller.save();

  if (nft) {
    let listNFT = new ListNFT(
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
        event.params.seller.toHexString(),
        event.block.timestamp.toString(),
      ])
    );
    listNFT.nft = nft.id;
    listNFT.seller = event.params.seller.toHexString();
    listNFT.price = event.params.price;
    listNFT.sold = false;
    listNFT.date = event.block.timestamp;
    listNFT.save();
  }
}

export function handleBoughtNFT(event: BoughtNFTEvent): void {
  let marketplace = Marketplace.bind(dataSource.address());
  let listedNFT = marketplace.try_getListedNFT(
    event.params.nft,
    event.params.tokenId
  );
  let buyer = new User(event.params.buyer.toHexString());
  buyer.address = event.params.buyer.toHexString();
  buyer.save();
  if (!listedNFT.reverted) {
    let listNFT = ListNFT.load(
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
        event.params.seller.toHexString(),
        listedNFT.value.date.toString(),
      ])
    );
    if (listNFT) {
      listNFT.sold = true;
      listNFT.save();
    }
    let nft = NFT.load(
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
      ])
    );
    log.info("nft = {}", [
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
      ]),
    ]);
    if (listNFT && nft) {
      let boughtNFT = new BuyNFT(
        generateId([
          event.params.nft.toHexString(),
          event.params.tokenId.toString(),
          event.params.buyer.toHexString(),
          event.block.timestamp.toString(),
        ])
      );
      boughtNFT.nft = nft.id;
      boughtNFT.buyer = event.params.buyer.toHexString();
      boughtNFT.date = event.block.timestamp;
      boughtNFT.listNFT = listNFT.id;
      boughtNFT.save();
    }
  }
}

export function handleOfferredNFT(event: OfferredNFTEvent): void {
  let marketplace = Marketplace.bind(dataSource.address());
  let listedNFT = marketplace.try_getListedNFT(
    event.params.nft,
    event.params.tokenId
  );

  let nft = NFT.load(
    generateId([
      event.params.nft.toHexString(),
      event.params.tokenId.toString(),
    ])
  );

  let offerer = new User(event.params.offerer.toHexString());
  offerer.address = event.params.offerer.toHexString();
  offerer.save();

  if (nft) {
    if (!listedNFT.reverted) {
      let listNFT = ListNFT.load(
        generateId([
          event.params.nft.toHexString(),
          event.params.tokenId.toString(),
          listedNFT.value.seller.toHexString(),
          listedNFT.value.date.toString(),
        ])
      );
      if (listNFT) {
        let offerNFT = new OfferNFT(
          generateId([
            event.params.nft.toHexString(),
            event.params.tokenId.toString(),
            event.params.offerer.toHexString(),
          ])
        );
        offerNFT.nft = nft.id;
        offerNFT.listNFT = listNFT.id;
        offerNFT.offerer = event.params.offerer.toHexString();
        offerNFT.offerPrice = event.params.offerPrice;
        offerNFT.accepted = false;
        offerNFT.canceled = false;
        offerNFT.save();
      }
    }
  }
}

export function handleCanceledNFT(event: CanceledOfferredNFTEvent): void {
  let nft = NFT.load(
    generateId([
      event.params.nft.toHexString(),
      event.params.tokenId.toString(),
    ])
  );

  let offerer = new User(event.params.offerer.toHexString());
  offerer.address = event.params.offerer.toHexString();
  offerer.save();

  if (nft) {
    let offerNFT = OfferNFT.load(
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
        event.params.offerer.toHexString(),
      ])
    );

    if (offerNFT) {
      offerNFT.canceled = true;
      offerNFT.save();
    }
  }
}

export function handleAcceptedNFT(event: AcceptedNFTEvent): void {
  let marketplace = Marketplace.bind(dataSource.address());
  let listedNFT = marketplace.try_getListedNFT(
    event.params.nft,
    event.params.tokenId
  );

  let nft = NFT.load(
    generateId([
      event.params.nft.toHexString(),
      event.params.tokenId.toString(),
    ])
  );

  if (nft && !listedNFT.reverted) {
    let listNFT = ListNFT.load(
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
        listedNFT.value.seller.toHexString(),
        listedNFT.value.date.toString(),
      ])
    );

    let offerNFT = OfferNFT.load(
      generateId([
        event.params.nft.toHexString(),
        event.params.tokenId.toString(),
        event.params.offerer.toHexString(),
      ])
    );

    if (listNFT && offerNFT) {
      listNFT.sold = true;
      offerNFT.accepted = true;
      listNFT.save();
      offerNFT.save();
    }
  }
}

function generateId(keys: string[]): string {
  return keys.join("-");
}

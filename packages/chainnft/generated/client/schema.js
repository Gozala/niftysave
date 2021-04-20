"use strict";
exports.__esModule = true;
exports.isSubscription = exports.is_Block_ = exports.is_Meta_ = exports.isOwnerPerTokenContract = exports.isOwner = exports.isTokenContract = exports.isToken = exports.isAll = exports.isQuery = exports._SubgraphErrorPolicy_ = exports.OwnerPerTokenContract_orderBy = exports.Owner_orderBy = exports.TokenContract_orderBy = exports.Token_orderBy = exports.OrderDirection = exports.All_orderBy = void 0;
var All_orderBy;
(function (All_orderBy) {
    All_orderBy["id"] = "id";
    All_orderBy["numTokenContracts"] = "numTokenContracts";
    All_orderBy["numTokens"] = "numTokens";
    All_orderBy["numOwners"] = "numOwners";
})(All_orderBy = exports.All_orderBy || (exports.All_orderBy = {}));
var OrderDirection;
(function (OrderDirection) {
    OrderDirection["asc"] = "asc";
    OrderDirection["desc"] = "desc";
})(OrderDirection = exports.OrderDirection || (exports.OrderDirection = {}));
var Token_orderBy;
(function (Token_orderBy) {
    Token_orderBy["id"] = "id";
    Token_orderBy["contract"] = "contract";
    Token_orderBy["tokenID"] = "tokenID";
    Token_orderBy["owner"] = "owner";
    Token_orderBy["mintTime"] = "mintTime";
    Token_orderBy["tokenURI"] = "tokenURI";
    Token_orderBy["blockNumber"] = "blockNumber";
    Token_orderBy["blockHash"] = "blockHash";
})(Token_orderBy = exports.Token_orderBy || (exports.Token_orderBy = {}));
var TokenContract_orderBy;
(function (TokenContract_orderBy) {
    TokenContract_orderBy["id"] = "id";
    TokenContract_orderBy["name"] = "name";
    TokenContract_orderBy["symbol"] = "symbol";
    TokenContract_orderBy["doAllAddressesOwnTheirIdByDefault"] = "doAllAddressesOwnTheirIdByDefault";
    TokenContract_orderBy["supportsEIP721Metadata"] = "supportsEIP721Metadata";
    TokenContract_orderBy["tokens"] = "tokens";
    TokenContract_orderBy["numTokens"] = "numTokens";
    TokenContract_orderBy["numOwners"] = "numOwners";
})(TokenContract_orderBy = exports.TokenContract_orderBy || (exports.TokenContract_orderBy = {}));
var Owner_orderBy;
(function (Owner_orderBy) {
    Owner_orderBy["id"] = "id";
    Owner_orderBy["tokens"] = "tokens";
    Owner_orderBy["numTokens"] = "numTokens";
})(Owner_orderBy = exports.Owner_orderBy || (exports.Owner_orderBy = {}));
var OwnerPerTokenContract_orderBy;
(function (OwnerPerTokenContract_orderBy) {
    OwnerPerTokenContract_orderBy["id"] = "id";
    OwnerPerTokenContract_orderBy["owner"] = "owner";
    OwnerPerTokenContract_orderBy["contract"] = "contract";
    OwnerPerTokenContract_orderBy["numTokens"] = "numTokens";
})(OwnerPerTokenContract_orderBy = exports.OwnerPerTokenContract_orderBy || (exports.OwnerPerTokenContract_orderBy = {}));
var _SubgraphErrorPolicy_;
(function (_SubgraphErrorPolicy_) {
    /** Data will be returned even if the subgraph has indexing errors */
    _SubgraphErrorPolicy_["allow"] = "allow";
    /** If the subgraph has indexing errors, data will be omitted. The default. */
    _SubgraphErrorPolicy_["deny"] = "deny";
})(_SubgraphErrorPolicy_ = exports._SubgraphErrorPolicy_ || (exports._SubgraphErrorPolicy_ = {}));
var Query_possibleTypes = ['Query'];
var isQuery = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return Query_possibleTypes.includes(obj.__typename);
};
exports.isQuery = isQuery;
var All_possibleTypes = ['All'];
var isAll = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return All_possibleTypes.includes(obj.__typename);
};
exports.isAll = isAll;
var Token_possibleTypes = ['Token'];
var isToken = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return Token_possibleTypes.includes(obj.__typename);
};
exports.isToken = isToken;
var TokenContract_possibleTypes = ['TokenContract'];
var isTokenContract = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return TokenContract_possibleTypes.includes(obj.__typename);
};
exports.isTokenContract = isTokenContract;
var Owner_possibleTypes = ['Owner'];
var isOwner = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return Owner_possibleTypes.includes(obj.__typename);
};
exports.isOwner = isOwner;
var OwnerPerTokenContract_possibleTypes = ['OwnerPerTokenContract'];
var isOwnerPerTokenContract = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return OwnerPerTokenContract_possibleTypes.includes(obj.__typename);
};
exports.isOwnerPerTokenContract = isOwnerPerTokenContract;
var _Meta__possibleTypes = ['_Meta_'];
var is_Meta_ = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return _Meta__possibleTypes.includes(obj.__typename);
};
exports.is_Meta_ = is_Meta_;
var _Block__possibleTypes = ['_Block_'];
var is_Block_ = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return _Block__possibleTypes.includes(obj.__typename);
};
exports.is_Block_ = is_Block_;
var Subscription_possibleTypes = ['Subscription'];
var isSubscription = function (obj) {
    if (!obj.__typename)
        throw new Error('__typename is missing');
    return Subscription_possibleTypes.includes(obj.__typename);
};
exports.isSubscription = isSubscription;
//# sourceMappingURL=schema.js.map
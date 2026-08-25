"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthClientStatus = exports.MessageChannel = exports.EventType = exports.MatchWinner = exports.MatchType = exports.EncounterStatus = exports.GenderRestriction = exports.CompetitionStatus = exports.CompetitionType = exports.CourseType = exports.LicenseStatus = exports.LicenseType = exports.Gender = exports.AssociationLevel = void 0;
var AssociationLevel;
(function (AssociationLevel) {
    AssociationLevel["NATIONAL"] = "NATIONAL";
    AssociationLevel["REGIONAL"] = "REGIONAL";
    AssociationLevel["LOCAL"] = "LOCAL";
})(AssociationLevel || (exports.AssociationLevel = AssociationLevel = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
var LicenseType;
(function (LicenseType) {
    LicenseType["PLAYER_REGULAR"] = "PLAYER_REGULAR";
    LicenseType["PLAYER_TCARD"] = "PLAYER_TCARD";
    LicenseType["PLAYER_WOMEN"] = "PLAYER_WOMEN";
    LicenseType["PLAYER_JUNIOR"] = "PLAYER_JUNIOR";
    LicenseType["PLAYER_SENIOR"] = "PLAYER_SENIOR";
    LicenseType["COACH"] = "COACH";
    LicenseType["REFEREE"] = "REFEREE";
})(LicenseType || (exports.LicenseType = LicenseType = {}));
var LicenseStatus;
(function (LicenseStatus) {
    LicenseStatus["PENDING_CLUB"] = "PENDING_CLUB";
    LicenseStatus["PENDING_ASSOCIATION"] = "PENDING_ASSOCIATION";
    LicenseStatus["APPROVED"] = "APPROVED";
    LicenseStatus["REJECTED"] = "REJECTED";
    LicenseStatus["EXPIRED"] = "EXPIRED";
    LicenseStatus["SUSPENDED"] = "SUSPENDED";
})(LicenseStatus || (exports.LicenseStatus = LicenseStatus = {}));
var CourseType;
(function (CourseType) {
    CourseType["COACH_REFRESHER"] = "COACH_REFRESHER";
    CourseType["REFEREE_REFRESHER"] = "REFEREE_REFRESHER";
})(CourseType || (exports.CourseType = CourseType = {}));
var CompetitionType;
(function (CompetitionType) {
    CompetitionType["LEAGUE"] = "LEAGUE";
    CompetitionType["TOURNAMENT"] = "TOURNAMENT";
})(CompetitionType || (exports.CompetitionType = CompetitionType = {}));
var CompetitionStatus;
(function (CompetitionStatus) {
    CompetitionStatus["DRAFT"] = "DRAFT";
    CompetitionStatus["REGISTRATION_OPEN"] = "REGISTRATION_OPEN";
    CompetitionStatus["REGISTRATION_CLOSED"] = "REGISTRATION_CLOSED";
    CompetitionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    CompetitionStatus["COMPLETED"] = "COMPLETED";
    CompetitionStatus["CANCELLED"] = "CANCELLED";
})(CompetitionStatus || (exports.CompetitionStatus = CompetitionStatus = {}));
var GenderRestriction;
(function (GenderRestriction) {
    GenderRestriction["ANY"] = "ANY";
    GenderRestriction["MALE_ONLY"] = "MALE_ONLY";
    GenderRestriction["FEMALE_ONLY"] = "FEMALE_ONLY";
    GenderRestriction["MIXED"] = "MIXED";
})(GenderRestriction || (exports.GenderRestriction = GenderRestriction = {}));
var EncounterStatus;
(function (EncounterStatus) {
    EncounterStatus["SCHEDULED"] = "SCHEDULED";
    EncounterStatus["LIVE"] = "LIVE";
    EncounterStatus["FINISHED"] = "FINISHED";
    EncounterStatus["POSTPONED"] = "POSTPONED";
    EncounterStatus["CANCELLED"] = "CANCELLED";
})(EncounterStatus || (exports.EncounterStatus = EncounterStatus = {}));
var MatchType;
(function (MatchType) {
    MatchType["SINGLE"] = "SINGLE";
    MatchType["DOUBLE"] = "DOUBLE";
})(MatchType || (exports.MatchType = MatchType = {}));
var MatchWinner;
(function (MatchWinner) {
    MatchWinner["HOME"] = "HOME";
    MatchWinner["AWAY"] = "AWAY";
    MatchWinner["DRAW"] = "DRAW";
    MatchWinner["PENDING"] = "PENDING";
})(MatchWinner || (exports.MatchWinner = MatchWinner = {}));
var EventType;
(function (EventType) {
    EventType["TOURNAMENT"] = "TOURNAMENT";
    EventType["LEAGUE_MATCH"] = "LEAGUE_MATCH";
    EventType["REFRESHER_COURSE"] = "REFRESHER_COURSE";
    EventType["ASSOCIATION_MEETING"] = "ASSOCIATION_MEETING";
    EventType["CLUB_EVENT"] = "CLUB_EVENT";
    EventType["TRAINING"] = "TRAINING";
})(EventType || (exports.EventType = EventType = {}));
var MessageChannel;
(function (MessageChannel) {
    MessageChannel["EMAIL"] = "EMAIL";
    MessageChannel["SMS"] = "SMS";
})(MessageChannel || (exports.MessageChannel = MessageChannel = {}));
var OAuthClientStatus;
(function (OAuthClientStatus) {
    OAuthClientStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    OAuthClientStatus["APPROVED"] = "APPROVED";
    OAuthClientStatus["REVOKED"] = "REVOKED";
})(OAuthClientStatus || (exports.OAuthClientStatus = OAuthClientStatus = {}));
//# sourceMappingURL=index.js.map
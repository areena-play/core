"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditCategory = exports.InvoiceTargetType = exports.InvoiceCategory = exports.InvoiceStatus = exports.OAuthClientStatus = exports.MessageChannel = exports.EventType = exports.MatchWinner = exports.MatchType = exports.EncounterStatus = exports.GenderRestriction = exports.CompetitionStatus = exports.CompetitionType = exports.CourseType = exports.LicenseStatus = exports.LicenseType = exports.Gender = exports.AssociationLevel = void 0;
__exportStar(require("./i18n"), exports);
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
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["SENT"] = "SENT";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["OVERDUE"] = "OVERDUE";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var InvoiceCategory;
(function (InvoiceCategory) {
    InvoiceCategory["MEMBERSHIP_FEE"] = "MEMBERSHIP_FEE";
    InvoiceCategory["LICENSE_FEE"] = "LICENSE_FEE";
    InvoiceCategory["COMPETITION_ENTRY"] = "COMPETITION_ENTRY";
    InvoiceCategory["COURSE_FEE"] = "COURSE_FEE";
    InvoiceCategory["EQUIPMENT"] = "EQUIPMENT";
    InvoiceCategory["PENALTY"] = "PENALTY";
    InvoiceCategory["OTHER"] = "OTHER";
})(InvoiceCategory || (exports.InvoiceCategory = InvoiceCategory = {}));
var InvoiceTargetType;
(function (InvoiceTargetType) {
    InvoiceTargetType["MEMBER_CLUB"] = "MEMBER_CLUB";
    InvoiceTargetType["CLUB_MEMBER"] = "CLUB_MEMBER";
    InvoiceTargetType["INDIVIDUAL_PLAYER"] = "INDIVIDUAL_PLAYER";
    InvoiceTargetType["SUB_ASSOCIATION"] = "SUB_ASSOCIATION";
    InvoiceTargetType["OTHER"] = "OTHER";
})(InvoiceTargetType || (exports.InvoiceTargetType = InvoiceTargetType = {}));
// ----------------------------------------
// AUDIT LOG & ACTIVITY TRACEABILITY TYPES
// ----------------------------------------
var AuditCategory;
(function (AuditCategory) {
    AuditCategory["AUTH"] = "AUTH";
    AuditCategory["GOVERNANCE"] = "GOVERNANCE";
    AuditCategory["FINANCE"] = "FINANCE";
    AuditCategory["COMMUNICATION"] = "COMMUNICATION";
    AuditCategory["LICENSING"] = "LICENSING";
    AuditCategory["TOURNAMENT"] = "TOURNAMENT";
    AuditCategory["CLUB"] = "CLUB";
    AuditCategory["DEVELOPER"] = "DEVELOPER";
    AuditCategory["SECURITY"] = "SECURITY";
})(AuditCategory || (exports.AuditCategory = AuditCategory = {}));
//# sourceMappingURL=index.js.map
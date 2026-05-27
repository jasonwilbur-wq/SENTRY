"""Pydantic models for SENTRY Executive Signal Scout.

These models intentionally mirror the docs-only data contract without adding
DB schema or API routes. Keep them strict enough to catch sloppy OSINT records,
but not so clever that callers need a ritual candle to instantiate them.
"""
from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class SourceQuality(StrEnum):
    HIGH_PRIMARY_SOURCE = "HIGH_PRIMARY_SOURCE"
    MEDIUM_REPUTABLE_SECONDARY = "MEDIUM_REPUTABLE_SECONDARY"
    LOW_SINGLE_SOURCE = "LOW_SINGLE_SOURCE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class SignalCategory(StrEnum):
    PUBLIC_APPEARANCE = "PUBLIC_APPEARANCE"
    BUSINESS_TRAVEL = "BUSINESS_TRAVEL"
    INITIATIVE = "INITIATIVE"
    MAJOR_DECISION = "MAJOR_DECISION"
    ORG_CHANGE = "ORG_CHANGE"
    PARTNERSHIP = "PARTNERSHIP"
    PUBLIC_QUOTE = "PUBLIC_QUOTE"
    RISK_OR_INCIDENT_CONTEXT = "RISK_OR_INCIDENT_CONTEXT"
    OTHER = "OTHER"


class VerificationStatus(StrEnum):
    LEAD_ONLY = "LEAD_ONLY"
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"
    VERIFIED = "VERIFIED"
    CONFLICTING = "CONFLICTING"
    REJECTED = "REJECTED"


class AnalystReviewStatus(StrEnum):
    NEW = "NEW"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    APPROVED_FOR_SENTRY = "APPROVED_FOR_SENTRY"
    APPROVED_FOR_CSO_DRAFT = "APPROVED_FOR_CSO_DRAFT"
    NEEDS_MORE_EVIDENCE = "NEEDS_MORE_EVIDENCE"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class SensitivityLevel(StrEnum):
    PUBLIC_BUSINESS = "PUBLIC_BUSINESS"
    PUBLIC_BUT_SENSITIVE = "PUBLIC_BUT_SENSITIVE"
    PRIVATE_OR_PROHIBITED = "PRIVATE_OR_PROHIBITED"
    UNKNOWN_REVIEW_REQUIRED = "UNKNOWN_REVIEW_REQUIRED"


class ExecutiveProfile(BaseModel):
    profile_id: str = Field(min_length=3)
    full_name: str = Field(min_length=2)
    organization: str = Field(min_length=2)
    title: str = ""
    status: str = "ACTIVE"
    aliases: list[str] = Field(default_factory=list)
    focus_topics: list[str] = Field(default_factory=list)
    collection_notes: str = "Public business signals only. No home/private tracking."
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("profile_id")
    @classmethod
    def profile_id_must_be_slug_like(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned.replace("_", "").replace("-", "").isalnum():
            raise ValueError("profile_id must be slug-like")
        return cleaned


class SignalCitation(BaseModel):
    citation_id: str = Field(min_length=3)
    source_id: str = Field(min_length=3)
    url: str = Field(min_length=8)
    source_title: str = Field(min_length=2)
    publisher: str = ""
    published_date: str = ""
    evidence_excerpt: str = Field(min_length=8)
    source_quality: SourceQuality = SourceQuality.REVIEW_REQUIRED
    citation_note: str = ""


class ExecutiveSignal(BaseModel):
    signal_id: str = Field(min_length=3)
    profile_id: str = Field(min_length=3)
    category: SignalCategory
    event_date: str = "UNKNOWN"
    event_location: str = "UNKNOWN"
    title: str = Field(min_length=3)
    summary: str = Field(min_length=8)
    business_relevance: str = Field(min_length=8)
    walmart_cso_relevance: str = Field(min_length=8)
    confidence_level: SourceQuality = SourceQuality.REVIEW_REQUIRED
    verification_status: VerificationStatus = VerificationStatus.LEAD_ONLY
    sensitivity_level: SensitivityLevel = SensitivityLevel.PUBLIC_BUSINESS
    analyst_review_status: AnalystReviewStatus = AnalystReviewStatus.NEW
    citations: list[SignalCitation] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("event_location")
    @classmethod
    def no_private_location_words(cls, value: str) -> str:
        private_terms = {"home", "residence", "address", "family home"}
        lowered = value.strip().lower()
        if any(term in lowered for term in private_terms):
            raise ValueError("private location detail is prohibited")
        return value.strip() or "UNKNOWN"

    def is_ready_for_cso_draft(self) -> bool:
        """Return whether this signal meets minimum CSO draft readiness."""
        if self.sensitivity_level != SensitivityLevel.PUBLIC_BUSINESS:
            return False
        if self.verification_status != VerificationStatus.VERIFIED:
            return False
        return any(c.source_quality == SourceQuality.HIGH_PRIMARY_SOURCE for c in self.citations)

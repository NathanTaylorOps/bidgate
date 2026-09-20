# ADR-0003 · Attractiveness and winnability are separate axes
**Status** accepted · 2026-09-16

## Context
A single total conflates "should we want this?" (client, scope, contract, capacity, materials, strategy) with "can we win it?" (relationship, incumbency, differentiators, price position). They have different owners — operations vs. business development — and different remedies.

## Decision
Groups carry an `axis`. Attractiveness drives the verdict band. Winnability feeds P(win) as the competitive-position score and is plotted against attractiveness on a GE/McKinsey-style 2×2 in the Pipeline view.

## Consequences
+ "Attractive but a long shot" and "winnable but a poor fit" become visible categories with different actions.
− The verdict does not include winnability directly; it enters through EV. This is deliberate — a poor-fit job you can certainly win is still a poor-fit job.

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


COMPONENTS = {
    "STM32F405RGT6": {
        "category": "Microcontroller / ARM",
        "supplier": "STMicroelectronics",
        "region": "Europe",
        "lifecycle": "active",
        "lead_time_days": 42,
        "stock": 1800,
        "package": "LQFP-64",
        "voltage": "1.8V-3.6V",
        "temperature": "-40C to 85C",
        "pinout_family": "STM32F4-LQFP64",
        "alternates": ["STM32F407VGT6", "STM32F415RGT6", "GD32F405RGT6"],
    },
    "MAX3232ESE+": {
        "category": "Interface Transceiver",
        "supplier": "Analog Devices",
        "region": "Southeast Asia",
        "lifecycle": "active",
        "lead_time_days": 76,
        "stock": 420,
        "package": "SOIC-16",
        "voltage": "3.0V-5.5V",
        "temperature": "-40C to 85C",
        "pinout_family": "RS232-SOIC16",
        "alternates": ["SP3232EEN-L", "TRS3232EIDR", "ICL3232ECAZ"],
    },
    "IRFB7430-PBF": {
        "category": "Power MOSFET / N-Ch",
        "supplier": "Infineon",
        "region": "North America",
        "lifecycle": "eol_watch",
        "lead_time_days": 128,
        "stock": 95,
        "package": "TO-220AB",
        "voltage": "40V",
        "temperature": "-55C to 175C",
        "pinout_family": "NCH-TO220",
        "alternates": ["IPP110N04S4-03", "FDBL86366-F085", "STP160N4F6"],
    },
    "TXS0108-EP": {
        "category": "Voltage Level Translator",
        "supplier": "Texas Instruments",
        "region": "North America",
        "lifecycle": "active",
        "lead_time_days": 35,
        "stock": 900,
        "package": "TSSOP-20",
        "voltage": "1.2V-5.5V",
        "temperature": "-40C to 125C",
        "pinout_family": "8BIT-TSSOP20",
        "alternates": ["TXS0108EPWR", "PCA9306D", "SN74AXC8T245PWR"],
    },
    "TSMC-7N-ASIC": {
        "category": "Custom ASIC Allocation",
        "supplier": "TSMC",
        "region": "Taiwan",
        "lifecycle": "allocation_constrained",
        "lead_time_days": 210,
        "stock": 12,
        "package": "Foundry Allocation",
        "voltage": "Node dependent",
        "temperature": "Program dependent",
        "pinout_family": "CUSTOM",
        "alternates": ["Samsung-8LPP-ASIC", "UMC-12FFC-ASIC"],
    },
    "STM32F407VGT6": {
        "category": "Microcontroller / ARM",
        "supplier": "STMicroelectronics",
        "region": "Europe",
        "lifecycle": "active",
        "lead_time_days": 48,
        "stock": 740,
        "package": "LQFP-100",
        "voltage": "1.8V-3.6V",
        "temperature": "-40C to 85C",
        "pinout_family": "STM32F4-LQFP100",
        "alternates": [],
    },
    "STM32F415RGT6": {
        "category": "Microcontroller / ARM",
        "supplier": "STMicroelectronics",
        "region": "Europe",
        "lifecycle": "active",
        "lead_time_days": 52,
        "stock": 510,
        "package": "LQFP-64",
        "voltage": "1.8V-3.6V",
        "temperature": "-40C to 85C",
        "pinout_family": "STM32F4-LQFP64",
        "alternates": [],
    },
    "GD32F405RGT6": {
        "category": "Microcontroller / ARM",
        "supplier": "GigaDevice",
        "region": "China",
        "lifecycle": "active",
        "lead_time_days": 61,
        "stock": 980,
        "package": "LQFP-64",
        "voltage": "1.8V-3.6V",
        "temperature": "-40C to 85C",
        "pinout_family": "STM32F4-LQFP64",
        "alternates": [],
    },
    "SP3232EEN-L": {
        "category": "Interface Transceiver",
        "supplier": "MaxLinear",
        "region": "Southeast Asia",
        "lifecycle": "active",
        "lead_time_days": 54,
        "stock": 1200,
        "package": "SOIC-16",
        "voltage": "3.0V-5.5V",
        "temperature": "-40C to 85C",
        "pinout_family": "RS232-SOIC16",
        "alternates": [],
    },
    "TRS3232EIDR": {
        "category": "Interface Transceiver",
        "supplier": "Texas Instruments",
        "region": "North America",
        "lifecycle": "active",
        "lead_time_days": 38,
        "stock": 2200,
        "package": "SOIC-16",
        "voltage": "3.0V-5.5V",
        "temperature": "-40C to 85C",
        "pinout_family": "RS232-SOIC16",
        "alternates": [],
    },
}


DISRUPTIONS = [
    {
        "id": "taiwan-strait-lanes",
        "title": "Taiwan Strait Lanes",
        "type": "geopolitical",
        "region": "Taiwan",
        "risk_score": 82,
        "severity": "critical",
        "signal": "Naval exercises and airspace compression affecting high-priority wafer logistics.",
    },
    {
        "id": "penang-ship-channels",
        "title": "Penang Ship Channels",
        "type": "shipping",
        "region": "Southeast Asia",
        "risk_score": 41,
        "severity": "watch",
        "signal": "Container dwell times elevated but still inside recoverable buffer windows.",
    },
    {
        "id": "kaohsiung-power-reserve",
        "title": "Kaohsiung Power Reserve",
        "type": "weather_energy",
        "region": "Taiwan",
        "risk_score": 74,
        "severity": "watch",
        "signal": "Heat load and grid reserve compression can stress backend fab operations.",
    },
    {
        "id": "lead-time-allocations",
        "title": "Lead-Time Allocations",
        "type": "procurement",
        "region": "Global",
        "risk_score": 88,
        "severity": "critical",
        "signal": "Distributor allocation windows tightening across MCU and transceiver families.",
    },
]


def _component(mpn: str) -> dict[str, Any]:
    key = mpn.strip().upper()
    return COMPONENTS.get(
        key,
        {
            "category": "Unclassified Component",
            "supplier": "Unknown",
            "region": "Unknown",
            "lifecycle": "needs_review",
            "lead_time_days": 95,
            "stock": 0,
            "package": "Unknown",
            "voltage": "Unknown",
            "temperature": "Unknown",
            "pinout_family": "Unknown",
            "alternates": [],
        },
    )


def specmatch(mpn: str) -> dict[str, Any]:
    source = _component(mpn)
    alternates = []
    for alt in source["alternates"]:
        alt_data = _component(alt)
        lead_time = alt_data["lead_time_days"]
        stock = alt_data["stock"]
        confidence = 92
        if alt_data["package"] != source["package"]:
            confidence -= 18
        if alt_data["pinout_family"] != source["pinout_family"]:
            confidence -= 22
        if lead_time > source["lead_time_days"]:
            confidence -= 8
        if stock < 100:
            confidence -= 10

        alternates.append(
            {
                "mpn": alt,
                "supplier": alt_data["supplier"],
                "package": alt_data["package"],
                "lead_time_days": lead_time,
                "stock": stock,
                "confidence": max(confidence, 35),
                "decision": "qualified" if confidence >= 70 else "engineering_review",
                "evidence": [
                    f"Package comparison: {source['package']} -> {alt_data['package']}",
                    f"Pinout family: {alt_data['pinout_family']}",
                    f"Lead time: {lead_time} days",
                ],
            }
        )

    return {
        "target": {"mpn": mpn.upper(), **source},
        "alternates": alternates,
        "summary": "SpecMatch evaluated package, pinout family, lead time, stock, and lifecycle fit.",
    }


def lifecycle_watch(mpn: str) -> dict[str, Any]:
    component = _component(mpn)
    lifecycle = component["lifecycle"]
    risk = {
        "active": (18, "No lifecycle action needed. Keep monitoring PCN/PDN feeds."),
        "eol_watch": (84, "Start last-time-buy analysis and qualify alternates now."),
        "allocation_constrained": (77, "Treat as constrained capacity; negotiate backup allocations."),
        "needs_review": (62, "Missing lifecycle data. Request manufacturer evidence or distributor status."),
    }.get(lifecycle, (55, "Lifecycle state requires review."))

    return {
        "mpn": mpn.upper(),
        "lifecycle_state": lifecycle,
        "eol_risk_score": risk[0],
        "recommended_action": risk[1],
        "watch_items": ["PCN", "PDN", "NRND", "last-time-buy", "replacement availability"],
    }


def disruption_scan(mpns: list[str]) -> dict[str, Any]:
    impacted = []
    for mpn in mpns:
        component = _component(mpn)
        region = component["region"]
        relevant = [event for event in DISRUPTIONS if event["region"] in {region, "Global"}]
        exposure = min(100, component["lead_time_days"] // 2 + len(relevant) * 15)
        impacted.append(
            {
                "mpn": mpn.upper(),
                "supplier": component["supplier"],
                "region": region,
                "exposure_score": exposure,
                "matched_events": relevant,
                "decision": "buffer_or_alternate" if exposure >= 70 else "monitor",
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "signals": DISRUPTIONS,
        "impacted_components": sorted(impacted, key=lambda item: item["exposure_score"], reverse=True),
    }


def scenario_plan(
    mpns: list[str],
    demand_growth_percent: int,
    buffer_days: int,
    shipping_delay_days: int,
    geo_risk_multiplier: float,
) -> dict[str, Any]:
    rows = []
    for mpn in mpns:
        component = _component(mpn)
        demand_factor = 1 + demand_growth_percent / 100
        supply_pressure = component["lead_time_days"] + shipping_delay_days - buffer_days
        risk = min(100, int((supply_pressure * geo_risk_multiplier) / 2 + demand_factor * 18))
        rows.append(
            {
                "mpn": mpn.upper(),
                "current_stock": component["stock"],
                "lead_time_days": component["lead_time_days"],
                "projected_risk": max(risk, 5),
                "recommended_buffer_days": max(buffer_days, component["lead_time_days"] // 2),
                "decision": "buy_now" if risk >= 75 else "qualify_alternate" if risk >= 55 else "hold",
            }
        )

    return {
        "inputs": {
            "demand_growth_percent": demand_growth_percent,
            "buffer_days": buffer_days,
            "shipping_delay_days": shipping_delay_days,
            "geo_risk_multiplier": geo_risk_multiplier,
        },
        "plan": sorted(rows, key=lambda item: item["projected_risk"], reverse=True),
    }

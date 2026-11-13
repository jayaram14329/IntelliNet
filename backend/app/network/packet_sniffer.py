import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

try:
    from scapy.all import sniff, IP, TCP, UDP, ICMP, ARP
    SCAPY_AVAILABLE = True
except Exception:
    SCAPY_AVAILABLE = False

class PacketSnifferManager:
    def __init__(self):
        self.is_sniffing: bool = False
        self.sniff_thread: Optional[threading.Thread] = None
        self.interface: Optional[str] = None
        self.capture_filter: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.packet_count: int = 0
        self.protocol_counts: Dict[str, int] = {
            "TCP": 0,
            "UDP": 0,
            "ICMP": 0,
            "ARP": 0,
            "OTHER": 0
        }
        self.error_warning: Optional[str] = None
        self._stop_event = threading.Event()

    def _packet_callback(self, packet):
        """Privacy-preserving packet processor: counts headers, disregards payload."""
        self.packet_count += 1
        if SCAPY_AVAILABLE:
            if packet.haslayer(TCP):
                self.protocol_counts["TCP"] += 1
            elif packet.haslayer(UDP):
                self.protocol_counts["UDP"] += 1
            elif packet.haslayer(ICMP):
                self.protocol_counts["ICMP"] += 1
            elif packet.haslayer(ARP):
                self.protocol_counts["ARP"] += 1
            else:
                self.protocol_counts["OTHER"] += 1

    def _worker(self, interface: Optional[str], capture_filter: Optional[str]):
        try:
            if not SCAPY_AVAILABLE:
                self.error_warning = "Scapy or Npcap is not available on this system."
                self.is_sniffing = False
                return

            sniff_kwargs = {
                "prn": self._packet_callback,
                "stop_filter": lambda p: self._stop_event.is_set(),
                "store": False
            }
            if interface and interface != "All Interfaces":
                sniff_kwargs["iface"] = interface
            if capture_filter:
                sniff_kwargs["filter"] = capture_filter

            sniff(**sniff_kwargs)
        except Exception as e:
            self.error_warning = f"Packet capture encountered an error: {str(e)}. (Note: Windows requires Npcap / WinPcap with administrator permissions for promiscuous packet capture)."
        finally:
            self.is_sniffing = False

    def start_capture(self, interface: Optional[str] = None, capture_filter: Optional[str] = None) -> Dict[str, Any]:
        if self.is_sniffing:
            return {"status": "error", "message": "Packet capture is already active."}

        self.packet_count = 0
        self.protocol_counts = {"TCP": 0, "UDP": 0, "ICMP": 0, "ARP": 0, "OTHER": 0}
        self.error_warning = None
        self.interface = interface
        self.capture_filter = capture_filter
        self.start_time = datetime.now(timezone.utc)
        self._stop_event.clear()
        self.is_sniffing = True

        self.sniff_thread = threading.Thread(
            target=self._worker,
            args=(interface, capture_filter),
            daemon=True
        )
        self.sniff_thread.start()

        return {
            "status": "success",
            "message": f"Packet capture initiated on interface '{interface or 'Default'}'",
            "start_time": self.start_time.isoformat()
        }

    def stop_capture(self) -> Dict[str, Any]:
        if not self.is_sniffing:
            return {"status": "warning", "message": "Packet capture is not currently running."}

        self._stop_event.set()
        self.is_sniffing = False
        duration = 0.0
        if self.start_time:
            duration = round((datetime.now(timezone.utc) - self.start_time).total_seconds(), 2)

        return {
            "status": "success",
            "message": "Packet capture halted successfully.",
            "duration_seconds": duration,
            "total_packets": self.packet_count,
            "protocol_breakdown": self.protocol_counts
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_sniffing": self.is_sniffing,
            "interface": self.interface,
            "packets_captured": self.packet_count,
            "capture_filter": self.capture_filter,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "summary": self.protocol_counts,
            "warning": self.error_warning
        }

sniffer_manager = PacketSnifferManager()

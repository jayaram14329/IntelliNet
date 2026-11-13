# IntelliNet Dataset Guide

## 1. Primary Intrusion Dataset: CIC-IDS2017

### Official Provenance
- **Source**: Canadian Institute for Cybersecurity (University of New Brunswick)
- **URL**: [https://www.unb.ca/cic/datasets/ids-2017.html](https://www.unb.ca/cic/datasets/ids-2017.html)
- **Description**: Contains benign traffic alongside common cyberattacks: Brute Force, DoS, DDoS, Web Attacks, Infiltration, Heartbleed, and Botnet.

### Supported Feature Schema
The IntelliNet preprocessing pipeline automatically sanitizes column headers by trimming leading/trailing whitespace, converting uppercase characters to lowercase, and translating slashes into underscores.

Key features utilized by the model:
| Normalized Feature | Description |
|-------------------|-------------|
| `destination_port` | Target service port (e.g. 80, 443, 22) |
| `flow_duration` | Total duration of the network flow in microseconds |
| `total_fwd_packets` | Count of packets traversing from source to destination |
| `total_backward_packets` | Count of response packets |
| `total_length_of_fwd_packets` | Aggregate payload size of forward packets |
| `flow_bytes_s` | Flow transmission rate in bytes per second |
| `flow_packets_s` | Instantaneous packet rate per second |
| `syn_flag_count` | Binary count of TCP SYN initiation flags |
| `fin_flag_count` | Binary count of TCP FIN teardown flags |
| `rst_flag_count` | Binary count of TCP RST abort flags |
| `label` | Ground truth classification (`BENIGN`, `DDoS`, `PortScan`, etc.) |

---

## 2. Congestion Telemetry Dataset

### Supported Fields
- `timestamp`: ISO-8601 formatted datetime string.
- `bandwidth_utilization_pct`: Percentage of link capacity consumed (0.0 to 100.0).
- `throughput_mbps`: Aggregate throughput in Megabits per second.
- `packet_rate_pps`: Packet rate in packets per second.
- `latency_ms`: Mean round-trip propagation and queuing delay in milliseconds.
- `packet_loss_pct`: Percentage of packets dropped due to buffer overflow.
- `jitter_ms`: Delay variation in milliseconds.
- `active_connections`: Concurrent TCP/UDP socket count.
- `congestion_level`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

---

## 3. Synthetic Benchmark Generator
For testing and academic demonstrations where multi-gigabyte PCAP files cannot be immediately downloaded, IntelliNet includes documented synthetic benchmark generators in `app.utils.dataset_generator`:
- `generate_cic_intrusion_benchmark(n_samples)`: Produces labeled flows mimicking CIC-IDS2017 distributions.
- `generate_congestion_benchmark(n_samples)`: Produces time-series telemetry illustrating queuing cycles and buffer drops.

All synthetic datasets are explicitly labeled with `is_synthetic: true` and `source: 'SYNTHETIC_BENCHMARK'` throughout the database and user interface.

"""Run only the isolated learning examples; never connect to IncidentLens databases."""
from pathlib import Path
import os, subprocess, sys
here = Path(__file__).resolve().parent
stages = {str(n): next(here.glob(f"Stage{n:02}*.java")) for n in range(5, 16)}
choice = sys.argv[1] if len(sys.argv) > 1 else "all"
if choice not in {*stages, "all"}: raise SystemExit("Use a stage number 5..15 or all")
needs_h2 = {"5", "6", "7", "12", "13", "14", "15"}
cache = Path.home()/".gradle/caches/modules-2/files-2.1/com.h2database/h2"
jars = sorted(cache.glob("2.3.232/*/h2-2.3.232.jar"))
explicit_jar = os.environ.get("INCIDENTLENS_H2_JAR")
if explicit_jar:
    candidate = Path(explicit_jar)
    if not candidate.is_file(): raise SystemExit("BLOCKED: INCIDENTLENS_H2_JAR is not an existing file. No download attempted.")
    jars = [candidate]
selected = list(stages) if choice == "all" else [choice]
if needs_h2.intersection(selected) and not jars:
    raise SystemExit("BLOCKED: no cached H2 jar. No download attempted. Continue reading the lesson.")
for number in selected:
    command = ["java"]
    if number in needs_h2: command += ["--class-path", str(jars[-1])]
    command += [str(stages[number])]
    print(f"--- Stage {number}: isolated example ---", flush=True)
    subprocess.run(command, check=True, timeout=45)
print(f"PASS: {len(selected)} isolated stage programs", flush=True)

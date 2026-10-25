"""Conservative pattern scan of Git-reachable history. Reports locations, never values.
Not a replacement for provider secret scanning or a professional assessment.
"""
import subprocess, re, json
patterns = {
 'private-key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'supabase-secret': re.compile(rb'sb_secret_[A-Za-z0-9_-]{20,}'),
 'groq-key': re.compile(rb'gsk_[A-Za-z0-9]{25,}'),
 'github-token': re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})'),
 'aws-key': re.compile(rb'(?:AKIA|ASIA)[A-Z0-9]{16}'),
 'database-password-url': re.compile(rb'postgres(?:ql)?://[^\s:/]+:([^\s@]+)@[^\s]+'),
}
objects = subprocess.check_output(['git','rev-list','--objects','--branches','--remotes']).splitlines()
findings=[]; count=0
def scan(data, path, oid):
 for kind,pattern in patterns.items():
  for match in pattern.finditer(data):
   if b'<' in match.group() or b'process.env' in match.group(): continue
   findings.append({'kind':kind,'path':path.decode(errors='replace'),'blob':oid.decode(),'line':data[:match.start()].count(b'\n')+1})
 # Decode JWT roles without logging the token itself.
 import base64
 for token in re.findall(rb'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',data):
  try:
   payload=token.split(b'.')[1];claims=json.loads(base64.urlsafe_b64decode(payload+b'='*((-len(payload))%4)))
   if claims.get('role')=='service_role':findings.append({'kind':'service-role-jwt','path':path.decode(errors='replace'),'blob':oid.decode()})
  except Exception:pass
for entry in objects:
 parts=entry.split(b' ',1)
 if len(parts)!=2: continue
 oid,path=parts
 if subprocess.check_output(['git','cat-file','-t',oid.decode()]).strip()!=b'blob':continue
 data=subprocess.check_output(['git','cat-file','blob',oid.decode()]);count+=1
 scan(data,path,oid)
# Include edits and new source files, excluding ignored local credentials/build outputs.
from pathlib import Path
working=0
for path in subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard']).split(b'\0'):
 if not path: continue
 file=Path(path.decode())
 if not file.is_file() or file.is_symlink(): continue
 scan(file.read_bytes(),path,b'working-tree'); working+=1
print(json.dumps({'blobs_scanned':count,'working_files_scanned':working,'findings':findings},indent=2))
raise SystemExit(bool(findings))

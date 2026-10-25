"""Generic operational alert; never include client data, request bodies or tokens."""
import os, smtplib, ssl
from email.message import EmailMessage
message=EmailMessage()
message['From']=os.environ['ALERT_FROM']
message['To']='guilhermekonnin@me.com'
message['Subject']='KOHAUS: verificar falha no backup diário'
message.set_content('O backup diário da KOHAUS falhou. Verifique a execução no GitHub Actions e o guia docs/SEGURANCA.md. Não compartilhe logs com dados pessoais ou credenciais.')
with smtplib.SMTP_SSL(os.environ['SMTP_HOST'],int(os.environ.get('SMTP_PORT','465')),context=ssl.create_default_context()) as smtp:
 smtp.login(os.environ['SMTP_USER'],os.environ['SMTP_PASSWORD'])
 smtp.send_message(message)

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { processarMensagem } from './handlers';

export function inicializarCliente() {
  const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true } });

  client.on('qr', qr => qrcode.generate(qr, { small: true }));
  client.on('ready', () => console.log('🤖 Bot está pronto!'));
  client.on('message_create', msg => processarMensagem(client, msg));
  client.on('message', msg => processarMensagem(client, msg));

  client.initialize();
}

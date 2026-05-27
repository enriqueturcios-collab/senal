import { createHmac } from 'crypto'

const SANDBOX_URL    = 'https://sandbox.dlocal.com'
const PRODUCTION_URL = 'https://api.dlocal.com'

function baseUrl() {
  return process.env.DLOCAL_SANDBOX === 'true' ? SANDBOX_URL : PRODUCTION_URL
}

function signRequest(body: string, date: string): string {
  const login  = process.env.DLOCAL_API_KEY!
  const secret = process.env.DLOCAL_SECRET_KEY!
  return createHmac('sha256', secret)
    .update(login + date + body)
    .digest('base64')
}

function buildHeaders(body: string) {
  const date = new Date().toISOString()
  const sig  = signRequest(body, date)
  return {
    'Content-Type':  'application/json',
    'X-Date':        date,
    'X-Login':       process.env.DLOCAL_API_KEY!,
    'X-Trans-Key':   process.env.DLOCAL_TRANS_KEY!,
    'Authorization': `V2-HMAC-SHA256, Signature=${sig}`,
  }
}

export interface DlocalPaymentInput {
  orderId:     string
  amountCents: number
  currency:    string
  country:     string
  description: string
  payerName:   string
  payerEmail:  string
  successUrl:  string
  cancelUrl:   string
  notifyUrl:   string
}

export interface DlocalPaymentResponse {
  id:           string
  status:       string
  redirect_url: string
  order_id:     string
}

export async function createDlocalPayment(input: DlocalPaymentInput): Promise<DlocalPaymentResponse> {
  const amount = input.amountCents / 100

  const body = JSON.stringify({
    amount,
    currency:            input.currency.toUpperCase(),
    country:             input.country.toUpperCase(),
    payment_method_id:   'CARD',
    payment_method_flow: 'REDIRECT',
    order_id:            input.orderId,
    description:         input.description,
    payer: {
      name:  input.payerName,
      email: input.payerEmail,
    },
    success_url:  input.successUrl,
    cancel_url:   input.cancelUrl,
    notification_url: input.notifyUrl,
  })

  const res = await fetch(`${baseUrl()}/payments`, {
    method:  'POST',
    headers: buildHeaders(body),
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`dLocal error ${res.status}: ${err}`)
  }

  return res.json()
}

export function verifyWebhookSignature(body: string, receivedSig: string): boolean {
  const secret   = process.env.DLOCAL_SECRET_KEY!
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === receivedSig
}

/**
 * Fictional sample messages. All names, numbers and links are invented.
 * Samples may use PREFER_ON_DEVICE (cloud stand-in) because they contain no real person's data.
 * Lookalike domains use the reserved ".example" style or obviously fake hosts.
 */
export interface Sample {
  id: string;
  title: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'parcel-uk',
    title: 'Parcel customs fee (UK)',
    text: 'Royal Mail: Hi Margaret, your parcel is held at our depot due to an unpaid customs fee of £1.99. Pay within 24 hours or it will be returned: https://royalmail-redelivery-fee.com/track?id=MW3381',
  },
  {
    id: 'bank-us',
    title: 'Bank account locked (US)',
    text: 'Chase Alert: Unusual sign-in detected on your account. Your access is suspended. Verify now at https://chase-secure-verify.net or reply with the 6-digit verification code we just sent.',
  },
  {
    id: 'family',
    title: '"Hi Mum, new number"',
    text: 'Hi Mum, it is me, I dropped my phone in the bath so this is my new number. Can you help me pay a bill of £640 today? I will pay you back Friday. Please do not call, the mic is broken x',
  },
  {
    id: 'tech-support',
    title: 'Computer virus warning',
    text: 'Microsoft Support: your computer is infected and your bank details are at risk. Call +1 202-555-0147 now and install AnyDesk so our technician can remove the virus.',
  },
  {
    id: 'genuine',
    title: 'Ordinary delivery update',
    text: 'USPS: Your package is out for delivery today. Track it at https://tools.usps.com/go/TrackConfirmAction',
  },
  {
    id: 'spanish',
    title: 'Paquete retenido (Spanish)',
    text: 'Correos: su paquete está retenido. Pague 2,99 € de tasas en las próximas 12 horas o será devuelto: https://correos-envio-pago.com/pagar',
  },
];

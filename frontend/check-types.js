import * as Lucide from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import React from 'react';

console.log('--- Lucide ---');
console.log('Package type:', typeof Lucide.Package);
console.log('CircleCheck type:', typeof Lucide.CircleCheck);

console.log('--- Other Libs ---');
console.log('QRCode type:', typeof QRCode);
console.log('QRCode value:', QRCode);

console.log('--- React ---');
console.log('React version:', React.version);

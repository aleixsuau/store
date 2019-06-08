import {animation, style, animate} from '@angular/animations';

export const fadeAnimation = animation([
  style({ opacity: '{{ from }}' }),
  animate('{{ time }}', style({ opacity: '{{ to }}' }))
]);

export const enterUpAnimation = animation([
  style({ opacity: '{{ fromOpacity || 0 }}', transform: 'translateY({{ translateY || "40px" }})' }),
  animate('{{ time || "500ms" }}', style({ opacity: '{{ toOpacity || 1 }}' }))
]);

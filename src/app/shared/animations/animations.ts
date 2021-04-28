import {animation, style, animate, transition, trigger, useAnimation} from '@angular/animations';

export const fadeAnimation = animation([
  style({ opacity: '{{ from }}' }),
  animate('{{ time }}', style({ opacity: '{{ to }}' }))
]);

export const enterUpAnimation = animation([
  style({ opacity: '{{ fromOpacity || 0 }}', transform: 'translateY({{ translateY || "40px" }})' }),
  animate('{{ time || "500ms" }}', style({ opacity: '{{ toOpacity || 1 }}' }))
]);

export const fadeAnimationDefault = [
  trigger('fade', [
    transition('void => *', [
      style({ opacity: 0 }),
      animate('500ms', style({ opacity: 1 }))
    ])
  ])
];

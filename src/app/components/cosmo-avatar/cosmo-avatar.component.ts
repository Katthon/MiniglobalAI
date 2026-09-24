import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cosmo-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cosmo-avatar.component.html',
  styleUrls: ['./cosmo-avatar.component.scss']
})
export class CosmoAvatarComponent {
  @Input() mood: 'happy' | 'celebration' | 'thinking' | 'talking' = 'happy';
  @Input() message: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}

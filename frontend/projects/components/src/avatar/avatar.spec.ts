import { TestBed } from '@angular/core/testing';
import { Avatar, AvatarStack, initialsOf } from '../public-api';

describe('initialsOf', () => {
  it.each([
    ['Grace Thompson', 'GT'],
    ['grace', 'G'],
    ['Mary Jane Watson', 'MW'],
    ['  danielle   okafor  ', 'DO'],
    ['élodie durand', 'ÉD'],
    ['', ''],
    ['   ', ''],
  ])('shows "%s" as "%s"', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

describe('Avatar', () => {
  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(Avatar);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows the initials of the name beside it, hidden from assistive technology', () => {
    const avatar = render({ name: 'Grace Thompson' }).element.querySelector('.avatar')!;

    expect(avatar.textContent?.trim()).toBe('GT');
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows given initials, such as a group chat’s, in place of the name’s', () => {
    const avatar = render({
      name: 'Easter Sunrise 5K',
      initials: '5K',
      variant: 'group',
    }).element.querySelector('.avatar')!;

    expect(avatar.textContent?.trim()).toBe('5K');
  });

  it('shows a photo with empty alt, because the name beside it says who it is', () => {
    const img = render({ name: 'Danielle Okafor', src: 'trainer.jpg' }).element.querySelector(
      'img.avatar',
    )!;

    expect(img.getAttribute('src')).toBe('trainer.jpg');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('falls back to the initials when the photo fails to load, never a broken image', () => {
    const { fixture, element } = render({ name: 'Danielle Okafor', src: 'missing.jpg' });

    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('DO');
  });

  it('tries a new photo after an earlier one failed', () => {
    const { fixture, element } = render({ name: 'Danielle Okafor', src: 'missing.jpg' });
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    fixture.componentRef.setInput('src', 'trainer.jpg');
    fixture.detectChanges();

    expect(element.querySelector('img')?.getAttribute('src')).toBe('trainer.jpg');
  });
});

describe('AvatarStack', () => {
  function render(names: readonly string[]) {
    const fixture = TestBed.createComponent(AvatarStack);
    fixture.componentRef.setInput('names', names);
    fixture.componentRef.setInput('label', 'Michael, Danielle and 140 others');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows at most five avatars and says the rest in words', () => {
    const element = render([
      'Michael Chen',
      'Danielle Okafor',
      'Priya Nair',
      'Ama Kwarteng',
      'Jon Reyes',
      'Grace Thompson',
    ]);

    expect([...element.querySelectorAll('.avatar')].map((a) => a.textContent?.trim())).toEqual([
      'MC',
      'DO',
      'PN',
      'AK',
      'JR',
    ]);
    expect(element.querySelector('.avatar-stack__label')?.textContent?.trim()).toBe(
      'Michael, Danielle and 140 others',
    );
  });
});

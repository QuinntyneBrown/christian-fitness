import { TestBed } from '@angular/core/testing';
import { SlackPreview } from './slack-preview';

// L2-072 AC4 (pick-art, slack-preview): the post as a Slack channel shows it.
describe('SlackPreview', () => {
  function create(note: string): HTMLElement {
    const fixture = TestBed.createComponent(SlackPreview);
    fixture.componentRef.setInput('time', '9:02 AM');
    fixture.componentRef.setInput('title', 'Easter Sunrise 5K');
    fixture.componentRef.setInput('note', note);
    fixture.componentRef.setInput(
      'details',
      'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
    );
    fixture.componentRef.setInput('site', 'www.christian.fitness');
    fixture.componentRef.setInput(
      'artLabel',
      'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
    );
    fixture.componentRef.setInput('src', 'blob:http://localhost/slack');
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.slack-preview')!;
  }

  const lines = (preview: HTMLElement): string[] =>
    [...preview.querySelectorAll('.slack-preview__body > p, .slack-preview__site')].map(
      (line) => line.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );

  it('shows who posted when, the linked title, the note, the details and the unfurl', () => {
    const preview = create('Flat, stroller-friendly.');

    expect(preview.getAttribute('aria-label')).toBe('How the post will look in Slack');
    expect(lines(preview)).toEqual([
      'Christian Fitness 9:02 AM',
      'Community Pick: Easter Sunrise 5K',
      'Flat, stroller-friendly.',
      'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
      'www.christian.fitness',
    ]);
    expect(preview.querySelector('.slack-preview__link')?.textContent).toBe('Easter Sunrise 5K');
    expect(preview.querySelector('.pick-art')?.getAttribute('class')).toBe(
      'pick-art pick-art--landscape',
    );
    expect(preview.querySelector('.pick-art img')?.getAttribute('src')).toBe(
      'blob:http://localhost/slack',
    );
  });

  it('leaves the note out when there is none', () => {
    expect(lines(create(''))).toHaveLength(4);
  });
});

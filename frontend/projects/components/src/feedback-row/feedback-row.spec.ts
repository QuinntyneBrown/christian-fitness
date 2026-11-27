import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FeedbackDetail } from './feedback-detail';
import { FeedbackRow } from './feedback-row';

async function row(isNew: boolean, current: boolean) {
  const fixture = TestBed.createComponent(FeedbackRow);
  fixture.componentRef.setInput('href', '/feedback?note=n1');
  fixture.componentRef.setInput('kind', 'problem');
  fixture.componentRef.setInput('from', '<i>Michael</i> Chen');
  fixture.componentRef.setInput('when', '35 min ago');
  fixture.componentRef.setInput('text', 'It opens a <b>blank</b> page');
  fixture.componentRef.setInput('label', 'Something’s off, New');
  fixture.componentRef.setInput('isNew', isNew);
  fixture.componentRef.setInput('current', current);
  const navigated: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  await fixture.whenStable();
  return { link: (fixture.nativeElement as HTMLElement).querySelector('a')!, navigated };
}

// L2-074 AC1, AC8 (feedback-row.html): who, when and the start of the text, the kind and status
// in words, a New sender in bold, every value as text.
describe('FeedbackRow', () => {
  it('is one link reading who, when, the text and the kind and status in words', async () => {
    const { link } = await row(true, true);

    expect(link.getAttribute('href')).toBe('/feedback?note=n1');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.querySelector('.feedback-row__from')?.textContent).toBe('<i>Michael</i> Chen');
    expect(link.querySelector('.feedback-row__from--new')).not.toBeNull();
    expect(link.querySelector('.feedback-row__when')?.textContent).toBe('35 min ago');
    expect(link.querySelector('.feedback-row__text')?.textContent).toBe(
      'It opens a <b>blank</b> page',
    );
    expect(link.querySelector('.visually-hidden')?.textContent).toBe('Something’s off, New');
    expect(link.querySelector('i, b')).toBeNull();
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is not current and not bold for a note already answered, and emits navigate on a plain click', async () => {
    const { link, navigated } = await row(false, false);

    expect(link.hasAttribute('aria-current')).toBe(false);
    expect(link.querySelector('.feedback-row__from--new')).toBeNull();
    link.click();
    expect(navigated).toEqual(['/feedback?note=n1']);
  });
});

@Component({
  imports: [FeedbackDetail],
  template: `<cf-feedback-detail
    kind="correction"
    kindLabel="Correction"
    status="new"
    statusLabel="New"
    when="2 hours ago"
    text="RCCG <b>Jesus House</b> is missing."
    fromName="Adaeze Kalu"
    fromEmail="adaeze.k@yahoo.ca"
    initials="AK"
    [suspended]="suspended"
    sentFrom="Story › Twelve GTA churches"
    device="Android · Chrome 124"
    ><p class="projected">Reply box</p></cf-feedback-detail
  >`,
})
class Host {
  suspended = false;
}

// L2-074 AC3, AC8 (feedback-row.html, "Detail"): the note in full, who sent it, where from, on what.
describe('FeedbackDetail', () => {
  async function render(suspended: boolean) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.suspended = suspended;
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (root: Element, selector: string) =>
    root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  it('shows the kind, status, when, full text and the facts, as text, with what follows projected', async () => {
    const root = await render(false);

    expect(text(root, '.kind-tag')).toBe('Correction');
    expect(text(root, '.status')).toBe('New');
    expect(text(root, '.feedback-detail__when')).toBe('2 hours ago');
    expect(text(root, 'h2')).toBe('Correction from Adaeze Kalu');
    expect(text(root, '.feedback-detail__text')).toBe('RCCG <b>Jesus House</b> is missing.');
    expect(root.querySelector('.feedback-detail__text b')).toBeNull();
    expect(
      Array.from(root.querySelectorAll('.feedback-detail__strong')).map((d) =>
        d.textContent?.trim(),
      ),
    ).toEqual(['Adaeze Kalu', 'Story › Twelve GTA churches', 'Android · Chrome 124']);
    expect(text(root, '.feedback-detail__sub')).toBe('adaeze.k@yahoo.ca');
    expect(root.querySelector('.status--suspended')).toBeNull();
    expect(text(root, '.projected')).toBe('Reply box');
  });

  it('labels a suspended sender in words', async () => {
    const root = await render(true);

    expect(text(root, '.status--suspended')).toBe('Suspended');
  });
});

import { TestBed } from '@angular/core/testing';
import { Editor } from './editor';

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Editor);
  const all = {
    heading: 'Edit story',
    backHref: '/stories',
    headline: '<b>Fasting</b>',
    ...inputs,
  };
  for (const [name, value] of Object.entries(all)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const area = (id: string) => el.querySelector<HTMLTextAreaElement>(`#${id}`)!;
  return { fixture, el, area };
}

describe('Editor', () => {
  it('labels the Headline, Summary and Story for assistive technology and holds the text as typed', async () => {
    const { el, area } = await render({ summary: 'Short', text: 'Long' });

    expect(
      Array.from(el.querySelectorAll('label')).map((label) => [label.htmlFor, label.textContent]),
    ).toEqual([
      ['f-headline', 'Headline'],
      ['f-summary', 'Summary'],
      ['f-story', 'Story'],
    ]);
    expect([area('f-headline').value, area('f-summary').value, area('f-story').value]).toEqual([
      '<b>Fasting</b>',
      'Short',
      'Long',
    ]);
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('aside')?.getAttribute('aria-label')).toBe('Publishing');
    expect(el.querySelector('h1')?.textContent).toBe('Edit story');
  });

  it('reports each edit of each text', async () => {
    const { fixture, area } = await render();
    const edits: string[] = [];
    fixture.componentInstance.headlineChange.subscribe((v) => edits.push(`headline:${v}`));
    fixture.componentInstance.summaryChange.subscribe((v) => edits.push(`summary:${v}`));
    fixture.componentInstance.textChange.subscribe((v) => edits.push(`text:${v}`));

    for (const [id, value] of [
      ['f-headline', 'H'],
      ['f-summary', 'S'],
      ['f-story', 'T'],
    ]) {
      area(id).value = value;
      area(id).dispatchEvent(new Event('input'));
    }

    expect(edits).toEqual(['headline:H', 'summary:S', 'text:T']);
  });

  it('marks an empty headline or text and makes the text read-only while an action runs', async () => {
    const { area } = await render({ headlineInvalid: true, textInvalid: true, readonly: true });

    expect([
      area('f-headline').getAttribute('aria-invalid'),
      area('f-summary').getAttribute('aria-invalid'),
      area('f-story').getAttribute('aria-invalid'),
    ]).toEqual(['true', null, 'true']);
    expect([area('f-headline').readOnly, area('f-story').readOnly]).toEqual([true, true]);
  });

  it('while loading, keeps the way back and stands skeletons in for the rest', async () => {
    const { el } = await render({ loading: true });

    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('[aria-busy="true"] h1')?.textContent).toBe('Loading story');
    expect(el.querySelector('.back-link')?.getAttribute('href')).toBe('/stories');
  });

  it('hands a plain click on the way back to the screen', async () => {
    const { fixture, el } = await render();
    const followed: string[] = [];
    fixture.componentInstance.navigate.subscribe((href) => followed.push(href));
    const back = el.querySelector<HTMLAnchorElement>('.back-link')!;

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    back.dispatchEvent(plain);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    back.dispatchEvent(modified);

    expect([plain.defaultPrevented, modified.defaultPrevented, followed]).toEqual([
      true,
      false,
      ['/stories'],
    ]);
  });
});

import { Component } from '@angular/core';
import { Container, Prose, SkipLink, TopBar } from '@cf/components';
import { LegalVersions } from '@cf/domain';
@Component({
  selector: 'cf-terms-page',
  imports: [Container, Prose, SkipLink, TopBar],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.scss',
})
export default class TermsPage {
  protected readonly effective = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(new LegalVersions().inForce('terms')!));
  protected readonly points = [
    'Christian Fitness is free to join. Some events and services cost money, and the price is always shown before you register. Any fee is paid to the host directly.',
    'Treat people the way you’d want to be treated at church. No harassment, spam or selling in group chats.',
    'Exercise has risks. Know your limits and talk to a doctor before starting something new.',
    'Professionals in the directory are independent. We check them, but they are responsible for their own work.',
    'We can remove content or accounts that break these terms, and you can leave whenever you like.',
  ];
  protected readonly sections = [
    {
      id: 'account',
      title: 'Your account',
      paragraphs: [
        'You must be 16 or older, which you confirm when you join, and give us accurate information. Keep your password to yourself; you’re responsible for what happens on your account.',
      ],
    },
    {
      id: 'conduct',
      title: 'Community standards',
      paragraphs: [
        'Christian Fitness is a faith community open to everyone who wants to take part respectfully, whatever their background or stage of faith.',
        'Don’t harass, shame or threaten anyone. Don’t post anything sexual, hateful or illegal. Don’t sell products, recruit for businesses or promote supplements in messages or group chats.',
        'Report anything that breaks these standards from the message or profile. Our team reviews every report.',
      ],
    },
    {
      id: 'events',
      title: 'Events and series',
      paragraphs: [
        'Hosts set the details, capacity and price of their events. Any fee for an event is paid to the host directly, under the host’s own terms; Christian Fitness takes no payment and gives no refunds.',
        'You can cancel your registration up to 24 hours before an event starts.',
      ],
    },
    {
      id: 'health',
      title: 'Health and safety',
      paragraphs: [
        'Physical activity carries a risk of injury. You take part in events at your own risk and should only do what is safe for you.',
        'Nothing on Christian Fitness, including stories, training plans and devotions, is medical advice. Talk to a doctor before starting a new exercise program, especially if you are pregnant, injured or managing a health condition.',
      ],
    },
    {
      id: 'directory',
      title: 'The directory and services',
      paragraphs: [
        'Listings are independent organizations and people. We check credentials, insurance, references and fit before a listing goes live, but we don’t supervise their work.',
        'Any agreement for services is between you and the provider.',
      ],
    },
    {
      id: 'content',
      title: 'What you post',
      paragraphs: [
        'You own what you post. You give us permission to show it on Christian Fitness so the service works, such as showing your messages to the people you sent them to.',
        'Don’t post anything you don’t have the right to share.',
      ],
    },
    {
      id: 'ending',
      title: 'Suspension and leaving',
      paragraphs: [
        'We may suspend or remove accounts that break these terms. Where we can, we’ll warn you first and tell you why.',
        'Contact the team if you want to close your account.',
      ],
    },
    {
      id: 'liability',
      title: 'Limits of our liability',
      paragraphs: [
        'Christian Fitness is provided as is. To the extent the law allows, we are not liable for indirect losses or for injuries at events run by independent hosts.',
      ],
    },
    {
      id: 'law',
      title: 'Governing law',
      paragraphs: [
        'These terms are governed by the laws of Ontario and the federal laws of Canada that apply there.',
      ],
    },
  ];
}

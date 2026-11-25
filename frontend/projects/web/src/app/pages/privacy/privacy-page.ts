import { LegalChange } from '../../legal/legal-change';
import { LegalNotice } from '../../legal/legal-notice';
import { Component } from '@angular/core';
import { Container, SideNavigation, Prose, SkipLink, TopBar } from '@cf/components';
import { LegalVersions } from '@cf/domain';
@Component({
  selector: 'cf-privacy-page',
  providers: [LegalNotice],
  imports: [LegalChange, Container, SideNavigation, Prose, SkipLink, TopBar],
  templateUrl: './privacy-page.html',
  styleUrl: './privacy-page.scss',
})
export default class PrivacyPage {
  protected readonly effective = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(new LegalVersions().inForce('privacy')!));
  protected readonly points = [
    'We use account details, registrations and messages to run the community.',
    'We never sell your information, and we don’t run ads.',
    'Your church, faith details and health goals are optional. Information you put on your public profile can be seen by other members.',
    'You can contact us about access to your information, corrections and deletion.',
    'Your data is stored in Canada and handled under PIPEDA. Our email provider may process email addresses outside Canada.',
    'If we change this policy, we tell you at least 30 days ahead; carrying on after that date means you accept the new version.',
  ];
  protected readonly sections = [
    {
      id: 'collect',
      title: 'What we collect',
      paragraphs: [
        'Account details include your name, email and sign-in information.',
        'Profile details you choose to add: your church, a short bio, goals and interests. These are optional.',
        'Activity includes events you register for and messages you send.',
        'Basic technical information: your network address is used to limit repeated requests.',
      ],
    },
    {
      id: 'use',
      title: 'How we use it',
      paragraphs: [
        'To run your account, register you for events and let the Christian Fitness team know who’s coming.',
        'To suggest events on your home page.',
        'To send password reset emails you request and service notices about changes to these documents.',
        'To keep the community safe, including reviewing reports and removing spam.',
      ],
    },
    {
      id: 'share',
      title: 'Who we share it with',
      paragraphs: [
        'The Christian Fitness team runs events and sees who has registered.',
        'Service providers who help us run Christian Fitness, such as email delivery and hosting, under contracts that limit them to that work.',
        'Authorities, only when the law requires it. We will tell you when we are allowed to.',
        'We do not sell or rent your information to anyone, ever.',
      ],
    },
    {
      id: 'sensitive',
      title: 'Faith and health information',
      paragraphs: [
        'Your church affiliation and health goals can reveal sensitive things about you. We treat them as sensitive information: they are never used for advertising and never shared with other members unless you put them on your public profile.',
      ],
    },
    {
      id: 'choices',
      title: 'Your choices',
      paragraphs: [
        'Contact the team at the address below to ask for access to your information, a correction or deletion.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      paragraphs: [
        'We keep account information, registrations and messages to run the community. We currently have no automatic account-erasure deadline. Contact us about the information we hold about you.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      paragraphs: [
        'Your data is encrypted in transit and at rest and stored on servers in Canada. Our email delivery provider may process email addresses outside Canada, to deliver account and service emails. Staff access is limited to the team members who need it.',
      ],
    },
    {
      id: 'children',
      title: 'Young people',
      paragraphs: [
        'You must be 16 or older to create an account. When you join we ask you to confirm that you are 16 or older. We do not ask for or keep your date of birth.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      paragraphs: [
        'If we make a meaningful change we will email you and show a notice in the app at least 30 days before it takes effect. That email is a service notice, so you get it even if you have turned off all other email. If you keep using Christian Fitness after the effective date, you accept the new version; we do not ask you to accept it again. Earlier versions stay readable at dated addresses identified by their effective dates.',
      ],
    },
  ];
}

import * as React from 'react';
import { Accordion } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';
import { Heading3 } from '@/components/Heading';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';
import styles from './LandingFaq.module.css';

interface HeadingProps {
  id?: string;
  children?: React.ReactNode;
}

interface Question {
  id: string;
  title: React.ReactNode;
  answer: React.ReactNode[];
}

/**
 * A band of questions that expand to reveal their answers.
 * Each markdown `###` heading is a question and everything up to the next one is its answer,
 * so the source stays plain markdown. Answers stay in the document while collapsed,
 * which keeps them crawlable and discoverable with the browser's find-in-page.
 * @param tone background treatment of the band
 * @param children markdown content, with one `###` heading per question
 */
export function LandingFaq({
  tone = 'plain',
  children,
}: {
  tone?: LandingTone;
  children: React.ReactNode;
}) {
  const intro: React.ReactNode[] = [];
  const questions: Question[] = [];

  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement<HeadingProps>(child) && child.type === Heading3) {
      if (!child.props.id) {
        throw new Error('LandingFaq expects every question heading to have an id');
      }
      questions.push({ id: child.props.id, title: child.props.children, answer: [] });
    } else if (questions.length === 0) {
      intro.push(child);
    } else {
      questions[questions.length - 1].answer.push(child);
    }
  });

  if (questions.length === 0) {
    throw new Error('LandingFaq expects each question as a markdown `###` heading');
  }

  return (
    <LandingSection tone={tone} centered>
      {intro}
      <Accordion.Root className={styles.list} keepMounted hiddenUntilFound>
        {questions.map((question) => (
          <Accordion.Item key={question.id} className={styles.item} value={question.id}>
            <Accordion.Header className={styles.header} id={question.id}>
              <Accordion.Trigger className={styles.trigger}>
                <span>{question.title}</span>
                <ChevronDown className={styles.chevron} aria-hidden />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className={styles.panel}>
              <div className={styles.answer}>{question.answer}</div>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </LandingSection>
  );
}

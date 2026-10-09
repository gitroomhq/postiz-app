import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Input } from './input';

vi.mock('../translation/translated-label', () => ({
  TranslatedLabel: ({ label }: { label: string }) => <span>{label}</span>,
}));

const Wrapper = ({
  children,
  errors,
}: {
  children: ReactNode;
  errors?: Record<string, { message: string }>;
}) => {
  const form = useForm();

  if (errors) {
    for (const [name, error] of Object.entries(errors)) {
      form.formState.errors[name] = error as never;
    }
  }

  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('Input', () => {
  it('renders the label text and a usable field', () => {
    render(
      <Wrapper>
        <Input label="Email Address" name="email" placeholder="Email Address" />
      </Wrapper>
    );

    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
  });

  it('does not associate its label with the input', () => {
    // The label is rendered as a sibling div with no htmlFor, and the input
    // gets no id, so getByLabelText cannot find it. This is exactly why the
    // Playwright specs select form fields by placeholder rather than by label,
    // and pinning it here means that constraint is discovered by a failing unit
    // test rather than by a confusing E2E failure.
    render(
      <Wrapper>
        <Input label="Email Address" name="email" placeholder="Email Address" />
      </Wrapper>
    );

    expect(() => screen.getByLabelText('Email Address')).toThrow();
  });

  it('forwards arbitrary input attributes', () => {
    render(
      <Wrapper>
        <Input label="Password" name="password" type="password" placeholder="Password" />
      </Wrapper>
    );

    expect(screen.getByPlaceholderText('Password')).toHaveAttribute(
      'type',
      'password'
    );
  });

  it('shows an explicit error over the form state', () => {
    render(
      <Wrapper>
        <Input label="Email" name="email" placeholder="Email" error="Explicit failure" />
      </Wrapper>
    );

    expect(screen.getByText('Explicit failure')).toBeInTheDocument();
  });

  it('renders no error container when removeError is set', () => {
    const { container } = render(
      <Wrapper>
        <Input label="Email" name="email" placeholder="Email" removeError error="hidden" />
      </Wrapper>
    );

    expect(container.querySelector('.text-red-400')).toBeNull();
  });

  it('calls customUpdate once on mount', () => {
    const customUpdate = vi.fn();

    render(
      <Wrapper>
        <Input label="Email" name="email" placeholder="Email" customUpdate={customUpdate} />
      </Wrapper>
    );

    expect(customUpdate).toHaveBeenCalled();
  });
});

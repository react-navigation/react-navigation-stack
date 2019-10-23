import * as React from 'react';
import { TextInput, Keyboard } from 'react-native';

type Props = {
  children: (props: {
    onPageChangeStart: () => void;
    onPageChangeConfirm: () => void;
    onPageChangeCancel: () => void;
  }) => React.ReactNode;
};

export default class KeyboardManager extends React.Component<Props> {
  // Numeric id of the previously focused text input
  // When a gesture didn't change the tab, we can restore the focused input with this
  private previouslyFocusedTextInput: number | null = null;
  private startTimestamp: number = 0;

  private handlePageChangeStart = () => {
    const input = TextInput.State.currentlyFocusedField();

    // When a page change begins, blur the currently focused input
    TextInput.State.blurTextInput(input);

    // Store the id of this input so we can refocus it if change was cancelled
    this.previouslyFocusedTextInput = input;

    // Store timestamp for touch start
    this.startTimestamp = Date.now();
  };

  private handlePageChangeConfirm = () => {
    Keyboard.dismiss();

    // Cleanup the ID on successful page change
    this.previouslyFocusedTextInput = null;
  };

  private handlePageChangeCancel = () => {
    // The page didn't change, we should restore the focus of text input
    const input = this.previouslyFocusedTextInput;

    if (input) {
      // If the interaction was super short we should make sure keyboard won't hide again
      if (Date.now() - this.startTimestamp < 100) {
        setTimeout(() => {
          TextInput.State.focusTextInput(input);
          this.previouslyFocusedTextInput = null;
        }, 100);
      } else {
        TextInput.State.focusTextInput(input);
        this.previouslyFocusedTextInput = null;
      }
    }
  };

  render() {
    return this.props.children({
      onPageChangeStart: this.handlePageChangeStart,
      onPageChangeConfirm: this.handlePageChangeConfirm,
      onPageChangeCancel: this.handlePageChangeCancel,
    });
  }
}

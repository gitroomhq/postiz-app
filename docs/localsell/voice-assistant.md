# Voice assistant

The first UI adapter can use browser speech recognition, but it implements a neutral `SpeechToTextProvider` contract so a server transcription provider can be selected later.  Transcripts are sent to an intent service that returns a validated command such as `CREATE_POST`, `EDIT_POST`, `CHANGE_LANGUAGE`, `GENERATE_IMAGE`, `SAVE_DRAFT` or `SCHEDULE_POST`.

Intent extraction supports English, Hindi, Hinglish and mixed text.  Commands create a preview or draft only.  Schedule, publish and outbound message actions display a final confirmation using the existing Postiz workflow.

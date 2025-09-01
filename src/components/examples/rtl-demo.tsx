/**
 * RTL Functionality Demo Component
 * Demonstrates automatic RTL text handling features
 */

'use client';

import { Copy, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import {
  BidiText,
  DirectionIndicator,
  PersianText,
  SmartInput,
  SmartTextarea,
} from '@/components/rtl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { detectTextDirection } from '@/utils/text-direction';

export function RTLDemo() {
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [showDebug, setShowDebug] = useState(true);
  const [currentDirection, setCurrentDirection] = useState<'rtl' | 'ltr' | 'neutral'>('neutral');

  // Sample texts for demonstration
  const sampleTexts = [
    'Hello, this is English text.',
    'سلام، این متن فارسی است.',
    'Mixed text: سلام Hello مخلوط',
    '۱۲۳۴ تومان قیمت محصول',
    'Product price is $1234',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, direction: 'rtl' | 'ltr' | 'neutral') => {
    setInputValue(e.target.value);
    setCurrentDirection(direction);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaValue(e.target.value);
  };

  const loadSampleText = (text: string) => {
    setInputValue(text);
    setCurrentDirection(detectTextDirection(text));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>RTL Text Handling Demo</CardTitle>
          <CardDescription>
            Automatic text direction detection and RTL rendering for Persian content
          </CardDescription>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2"
            >
              {showDebug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Sample Texts */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Texts</CardTitle>
          <CardDescription>
            Click on any sample to test automatic direction detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleTexts.map(text => (
            <div key={text} className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadSampleText(text)}
                  className="flex items-center gap-2 h-auto p-2"
                >
                  <Copy className="h-3 w-3" />
                  Load
                </Button>
                <div className="flex-1">
                  <BidiText className="text-sm">{text}</BidiText>
                </div>
                {showDebug && (
                  <DirectionIndicator direction={detectTextDirection(text)} />
                )}
              </div>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Smart Input Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Input Field</CardTitle>
          <CardDescription>
            Input field that automatically detects and adjusts text direction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="smart-input-demo" className="text-sm font-medium">Smart Input:</label>
              {showDebug && (
                <DirectionIndicator direction={currentDirection} />
              )}
            </div>
            <SmartInput
              id="smart-input-demo"
              placeholder="Type in English or Persian... / به فارسی یا انگلیسی تایپ کنید..."
              value={inputValue}
              onChange={handleInputChange}
              persianNumbers={true}
              className="w-full"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Current value: "
            {inputValue}
            " | Direction:
            {' '}
            {currentDirection}
          </div>
        </CardContent>
      </Card>

      {/* Smart Textarea Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Textarea</CardTitle>
          <CardDescription>
            Multi-line text area with automatic direction detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="smart-textarea-demo" className="text-sm font-medium">Smart Textarea:</label>
              {showDebug && (
                <DirectionIndicator
                  direction={detectTextDirection(textareaValue)}
                />
              )}
            </div>
            <SmartTextarea
              id="smart-textarea-demo"
              placeholder={`Try typing:
English text flows left to right.
متن فارسی از راست به چپ می‌رود.
Mixed content مخلوط works too!`}
              value={textareaValue}
              onChange={handleTextareaChange}
              persianNumbers={true}
              className="w-full min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* BidiText Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Bidirectional Text Components</CardTitle>
          <CardDescription>
            Examples of different text rendering components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Regular BidiText */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">BidiText Component:</h4>
            <div className="p-3 bg-muted rounded-md space-y-2">
              <BidiText>This is English text in BidiText</BidiText>
              <BidiText>این متن فارسی در BidiText است</BidiText>
              <BidiText>Mixed: سلام Hello مخلوط Content</BidiText>
            </div>
          </div>

          {/* PersianText */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">PersianText Component:</h4>
            <div className="p-3 bg-muted rounded-md space-y-2">
              <PersianText>متن فارسی با فونت مخصوص</PersianText>
              <PersianText persianNumbers={true}>قیمت: 1234 تومان</PersianText>
              <PersianText persianNumbers={false}>قیمت: 1234 تومان</PersianText>
            </div>
          </div>

          {/* Currency Examples */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Currency Formatting:</h4>
            <div className="p-3 bg-muted rounded-md space-y-2">
              <BidiText className="persian-currency">۱۲,۳۴۵ تومان</BidiText>
              <BidiText className="persian-currency">۵۶۷,۸۹۰ ریال</BidiText>
              <BidiText>$1,234.56</BidiText>
            </div>
          </div>

          {/* Status Badges */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Status Badges:</h4>
            <div className="p-3 bg-muted rounded-md space-y-2 flex flex-wrap gap-2">
              <div className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800">
                <PersianText>فعال</PersianText>
              </div>
              <div className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                <PersianText>معوق</PersianText>
              </div>
              <div className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800">
                <PersianText>لغو شده</PersianText>
              </div>
              <div className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-800">
                <BidiText>Active</BidiText>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Information */}
      {showDebug && (
        <Card>
          <CardHeader>
            <CardTitle>Technical Information</CardTitle>
            <CardDescription>
              Debug information about text direction detection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs font-mono bg-muted p-3 rounded-md">
              <div>
                Input Value: "
                {inputValue}
                "
              </div>
              <div>
                Detected Direction:
                {currentDirection}
              </div>
              <div>
                Contains Persian:
                {inputValue ? /[\u0600-\u06FF]/.test(inputValue).toString() : 'false'}
              </div>
              <div>
                Character Count:
                {inputValue.length}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

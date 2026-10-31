import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Colors, Fonts, Spacing, Radii } from '../../src/theme';

interface CalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  minDate?: Date;
  style?: any;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  minDate = new Date(),
  style,
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Quick select helper
  const selectQuickDay = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onSelectDate(`${yyyy}-${mm}-${dd}`);
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
  };

  // Calendar calculations
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    daysArray.push(d);
  }

  const formatDayString = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Quick Select Buttons */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => selectQuickDay(0)}
        >
          <Text style={styles.quickText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => selectQuickDay(1)}
        >
          <Text style={styles.quickText}>Tomorrow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => selectQuickDay(3)}
        >
          <Text style={styles.quickText}>In 3 Days</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => selectQuickDay(7)}
        >
          <Text style={styles.quickText}>Next Week</Text>
        </TouchableOpacity>
      </View>

      {/* Month & Year Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Days of Week Row */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((day, idx) => (
          <Text
            key={day}
            style={[
              styles.weekText,
              (idx === 0 || idx === 6) && styles.weekendText,
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} style={styles.dayCell} />;
          }

          const dayDate = new Date(currentYear, currentMonth, day);
          dayDate.setHours(0, 0, 0, 0);

          const isPast = dayDate < today;
          const isToday = dayDate.getTime() === today.getTime();
          const dayString = formatDayString(day);
          const isSelected = selectedDate === dayString;

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                isSelected && styles.selectedCell,
              ]}
              disabled={isPast}
              onPress={() => onSelectDate(dayString)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isPast && styles.pastText,
                  isToday && styles.todayText,
                  isSelected && styles.selectedText,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Indicator */}
      {selectedDate ? (
        <View style={styles.selectedBanner}>
          <Text style={styles.selectedBannerText}>
            Selected Date: <Text style={styles.boldDate}>{selectedDate}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  quickChip: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.xs,
  },
  navBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  navArrow: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  monthTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: '800',
    color: Colors.darkText,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xs,
  },
  weekText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  weekendText: {
    color: Colors.warning,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: Radii.full,
  },
  dayText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.darkText,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  todayText: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  selectedCell: {
    backgroundColor: Colors.primary,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pastText: {
    color: '#CBD5E1',
  },
  selectedBanner: {
    backgroundColor: Colors.secondary,
    borderRadius: Radii.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  selectedBannerText: {
    fontSize: 12,
    color: Colors.darkText,
  },
  boldDate: {
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});


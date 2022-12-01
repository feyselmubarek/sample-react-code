import {
    Box,
    Button,
    ButtonGroup,
    Divider,
    Flex,
    Heading,
    HStack,
    Link,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    VStack,
    Wrap,
  } from '@chakra-ui/react';
  import _ from 'lodash';
  import { GetStaticProps } from 'next';
  import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
  import { createRef, ForwardedRef, forwardRef, Fragment, useEffect, useState } from 'react';
  
  import { MetaTags } from '../components/common/MetaTags';
  import SpecialDateGroup from '../components/specialDates/SpecialDatesGroup';
  import { useFlavoredTranslation } from '../hooks/useFlavoredTranslation';
  import { CalendarType, NvDateTime } from '../lib/calendar/calendar';
  import { NvSpecialDate } from '../nvapi/types';
  import { getAllSpecialDates, parseDateTimes } from '../utils/specialDates';
  
  const TODAY_TITLE = '###TODAY###';
  
  const getToday = () => {
    return NvDateTime.now(CalendarType.GREGORIAN).toISODate();
  };
  
  const MonthLine = (
    props: {
      calendar: CalendarType;
      month: string;
    },
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const { t } = useFlavoredTranslation();
    return (
      <Flex ref={ref} width="100%" paddingY={6} alignItems="center">
        <Heading size="sm" mr="4" fontSize="2xl">
          {t(`${props.calendar}_month.${props.month}`)}
        </Heading>
        <Divider flex={1} borderColor="gray.300" />
      </Flex>
    );
  };
  
  const MonthLineWithRef = forwardRef(MonthLine);
  
  const SpecialDates = () => {
    const { t, i18n } = useFlavoredTranslation();
    const [today, setToday] = useState(getToday());
    const [calendarType, setCalendarType] = useState(CalendarType.GREGORIAN);
    const allSpecialDates = getAllSpecialDates(i18n.resolvedLanguage);
  
    useEffect(() => {
      // Used to test the today specific behavior without fiddling with system time
      const todayOverride = new URLSearchParams(window.location.search).get('__test_today');
      setToday(todayOverride || getToday());
    }, []);
  
    // We inject a today line if today is not a special date
    if (!allSpecialDates.find((sd: NvSpecialDate) => sd.date === today)) {
      allSpecialDates.push({
        date: today,
        hDate: NvDateTime.now(CalendarType.HIJRI).toISODate(),
        title: TODAY_TITLE,
      });
    }
  
    const sortedDateTimeGroups = _(allSpecialDates)
      .map((date) => {
        const { dateTime, altDateTime } = parseDateTimes(calendarType, date);
        return {
          specialDate: date,
          dateTime: dateTime,
          altDateTime: altDateTime,
        };
      })
      .groupBy((date) => date.dateTime.year)
      .mapValues((yearGroup) =>
        _(yearGroup)
          .groupBy((group) => group.dateTime.month)
          .mapValues((monthGroup) =>
            _(monthGroup)
              .groupBy((date) => date.specialDate.title)
              .values()
              .sortBy((dayGroup) => dayGroup[0].dateTime.valueOf())
              .value(),
          )
          .value(),
      )
      .value();
  
    const refs: Record<string, React.MutableRefObject<HTMLDivElement | null>> = {};
  
    const years = Object.keys(sortedDateTimeGroups);
    years.forEach((year) => {
      const months = _.sortBy(Object.keys(sortedDateTimeGroups[year]), (m) => parseInt(m, 10));
      months.forEach((month) => {
        const key = month + ':' + year;
        refs[key] = createRef();
      });
    });
  
    const scrollToMonth = (month: string) => {
      refs[month]?.current!.scrollIntoView({ behavior: 'smooth' });
    };
  
    const YearSelector = () => (
      <Flex justify="left">
        <TabList flexGrow={1}>
          {Object.keys(sortedDateTimeGroups)
            .sort()
            .map((year, key) => (
              <Tab key={key} fontWeight="bold" flexGrow={1}>
                {year}
              </Tab>
            ))}
        </TabList>
      </Flex>
    );
  
    const CalendarToggle = () => (
      <Box borderRadius={10} background="toggleButtonWellColor" padding={1} boxShadow="inner">
        <ButtonGroup>
          {[CalendarType.GREGORIAN, CalendarType.HIJRI].map((ct, key) => (
            <Button
              key={key}
              size="sm"
              width="100%"
              p={1}
              variant="none"
              boxShadow={(calendarType === ct && 'sm') || undefined}
              isActive={calendarType === ct}
              backgroundColor={calendarType === ct ? 'toggleButtonBackgroundColor' : undefined}
              color={calendarType === ct ? 'toggleButtonActiveColor' : 'toggleButtonColor'}
              minWidth={{ base: 16, sm: 24 }}
              onClick={() => {
                setCalendarType(ct);
              }}
            >
              {t(ct)}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    );
  
    const MonthSelector = (props: { year: string }) => {
      const months = sortedDateTimeGroups[props.year];
      const sortedMonths = _.sortBy(Object.keys(months), (m) => parseInt(m, 10));
  
      return (
        <Wrap spacing={4} mt={8} mb={6} justify={{ base: 'left', sm: 'start' }}>
          {sortedMonths.map((month, key) => (
            <Link key={key} onClick={() => scrollToMonth(month + ':' + props.year)} fontWeight="bold">
              {t(`${calendarType}_month.${month}`)}
            </Link>
          ))}
        </Wrap>
      );
    };
  
    return (
      <>
        <MetaTags pageTitle={t('special_dates:header')} />
        <VStack alignItems="start" spacing={8}>
          <HStack justifyContent="space-between" alignItems="start" width="100%">
            <Heading as="h1" fontWeight={700}>
              {t('special_dates:header')}
            </Heading>
  
            <CalendarToggle />
          </HStack>
  
          <Tabs width="100%" defaultIndex={1} colorScheme="brand">
            <YearSelector />
            <TabPanels width="100%">
              {years.map((year, key) => {
                const months = _.sortBy(Object.keys(sortedDateTimeGroups[year]), (m) =>
                  parseInt(m, 10),
                );
  
                return (
                  <TabPanel key={key} p={0}>
                    <>
                      <MonthSelector year={year} />
                      {months.map((month, month_key) => (
                        <Fragment key={month_key}>
                          <MonthLineWithRef
                            ref={refs[month + ':' + year]}
                            calendar={calendarType}
                            month={month}
                          />
                          <VStack width="100%" spacing={6}>
                            {sortedDateTimeGroups[year][month].map((group, key) => (
                              <SpecialDateGroup key={key} today={today} group={group} linkable />
                            ))}
                          </VStack>
                        </Fragment>
                      ))}
                    </>
                  </TabPanel>
                );
              })}
            </TabPanels>
          </Tabs>
        </VStack>
      </>
    );
  };
  
  export default SpecialDates;
  
  export const getStaticProps: GetStaticProps = async (context) => {
    return {
      props: {
        ...(context.locale &&
          (await serverSideTranslations(context.locale, ['common', 'special_dates']))),
      },
    };
  };
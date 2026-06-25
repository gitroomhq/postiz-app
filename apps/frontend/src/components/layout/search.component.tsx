import fuzzysort from 'fuzzysort';
import { useEffect, useRef, useState } from 'react';

export const useSearch: <T>(data: T[]) => {
  searchedResults: T[];
  SearchInputBox: React.JSX.Element;
} = (data) => {
  const inputRef = useRef<null | HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchedResults, setSearchedResults] = useState(data);

  useEffect(() => {
    const getSearchedResult = () => {
      if (!searchValue.trim()) {
        setSearchedResults(data);
      } else {
        const results = fuzzysort.go(searchValue, data, { key: 'name' });
        setSearchedResults(results.map((result) => result.obj));
      }
    };

    if (inputRef.current) {
      inputRef.current.focus();
    }

    getSearchedResult();
  }, [searchValue, inputRef]);

  const onSearchValueChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchValue(e.target.value);

  const SearchInputBox = (
    <input
      ref={inputRef}
      placeholder="Search..."
      value={searchValue}
      onChange={onSearchValueChange}
      className="text-white rounded-md py-1 px-2 bg-[#1e1d1d]"
    />
  );

  return {
    searchedResults,
    SearchInputBox,
  };
};

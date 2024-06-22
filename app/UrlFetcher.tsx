"use client"
import React, { ChangeEvent, FormEvent, useState, useEffect } from 'react';
import axios from 'axios';
import cheerio from 'cheerio';
import { extractNumber, formatNumberWithCommas, isSuitableHandler } from './utils';
import './globals.css'; // Import your CSS file for styling

interface Article {
    title: string;
    picture: string;
    href: string;
    deposit: number;
    rent: number;
    token: string;
    isSuitable: boolean;
}

const UrlFetcher: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [data, setData] = useState<Article[]>([]);
    const [lastPopUpPostList, setLastPopUpPostList] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (url) {
            fetchData(url);
        }
    }, [lastPopUpPostList]);

    const fetchData = async (url: string) => {
        setIsLoading(true);
        console.log("Crawling data...");
        try {
            const response = await axios.get(url);
            if (response.status !== 200) {
                console.log("Error occurred while fetching data");
                return;
            }
            processHtml(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const processHtml = (html: string) => {
        const articleList: Article[] = [];
        const $ = cheerio.load(html);

        const postListItems = $('.post-list__widget-col-c1444');

        postListItems.each(function () {
            const token = $(this).find('article.kt-post-card').attr('token') || '';
            const post = $(this).find(".kt-post-card__info");
            const title = $(post).find('h2.kt-post-card__title').text();
            const descriptionDivs = $(post).find('div.kt-post-card__description');

            const deposit = $(descriptionDivs[0]).text().trim();
            const rent = $(descriptionDivs[1]).text().trim();

            const picture = $(this).find('.kt-post-card-thumbnail img').attr('data-src') || '';
            const href = "https://divar.ir" + $(this).find('a').attr('href') || '';

            const newArticle: Article = {
                title,
                deposit: extractNumber(deposit),
                rent: extractNumber(rent),
                token,
                picture,
                href,
                isSuitable: isSuitableHandler({ deposit: extractNumber(deposit), rent: extractNumber(rent) })
            };

            // Optionally, you can push only if token is not empty to avoid invalid data
            if (token) {
                articleList.push(newArticle);
            }
        });

        setIsLoading(false)
        articleList.length > 0 && setData(articleList);
        checkForNewPosts(articleList);
    };

    const checkForNewPosts = (articleList: Article[]) => {
        const newArticles = articleList.filter(article =>
            !lastPopUpPostList.some(lastArticle => lastArticle.token === article.token)
        );

        if (newArticles.length > 0) {
            setLastPopUpPostList(newArticles);
            newArticles.forEach(article => showNotification(article));
        }

        setTimeout(() => {
            fetchData(url);
        }, newArticles.length > 0 ? 15000 : 30000);
    };

    const showNotification = (article: Article) => {
        if (article.isSuitable) {
            if (Notification.permission === 'granted') {
                new Notification(article.title, { body: `ودیعه: ${article.deposit}, اجاره: ${article.rent}` });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(article.title, { body: `ودیعه: ${article.deposit}, اجاره: ${article.rent}` });
                    }
                });
            }
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        fetchData(url);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
    };

    return (
        <div className="container">
            <form onSubmit={handleSubmit} className="url-form">
                <input
                    type="text"
                    value={url}
                    onChange={handleInputChange}
                    placeholder="Enter URL"
                    className="url-input"
                    disabled={isLoading}
                />
                <button type="submit" className="fetch-button" disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Fetch Data'}
                </button>
            </form>
            <div className="article-list">
                {data.length > 0 && (
                    <ul>
                        {data.map((item, index) => (
                            <a target='_blank' href={item.href} key={index} className="card">
                                <div className="card-image">
                                    <img src={item.picture} alt={item.title} />
                                </div>
                                <div className="card-content">
                                    <h2 className="card-title">{item.title}</h2>
                                    <p className="card-deposit">ودیعه: {formatNumberWithCommas(item.deposit)}</p>
                                    <p className="card-rent">اجاره: {formatNumberWithCommas(item.rent)}</p>
                                </div>
                            </a>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default UrlFetcher;
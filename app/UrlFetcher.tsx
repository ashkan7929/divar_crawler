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
    const [url, setUrl] = useState<string>('https://divar.ir/s/tehran/rent-apartment/ajudaniye?districts=1028%2C127%2C138%2C139%2C159%2C170%2C173%2C208%2C210%2C286%2C300%2C301%2C302%2C315%2C360%2C42%2C48%2C55%2C56%2C61%2C62%2C63%2C64%2C65%2C658%2C66%2C67%2C68%2C70%2C71%2C72%2C74%2C75%2C78%2C81%2C84%2C85%2C86%2C87%2C88%2C90%2C920%2C922%2C925%2C929%2C930%2C931%2C934%2C938%2C939%2C941%2C95%2C96&size=60-&rooms=2&floor=0-');
    const [data, setData] = useState<Article[]>([]);
    const [lastPopUpPostList, setLastPopUpPostList] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

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
                isSuitable: !title.includes('همخانه') && !title.includes('همخونه') && isSuitableHandler({ deposit: extractNumber(deposit), rent: extractNumber(rent) })
            };

            // Optionally, you can push only if token is not empty to avoid invalid data
            if (token) {
                articleList.push(newArticle);
            }
        });

        setIsLoading(false);
        if (articleList.length > 0) {

            setData(articleList);
            setLastPopUpPostList(prevState => {
                const newArticles = articleList.filter(article => {
                    return !prevState.some(lastArticle => lastArticle.token === article.token);
                });

                // Use a Set to track tokens of articles for which notifications have been shown
                const shownNotifications = new Set<string>();

                if (newArticles.length > 0) {
                    newArticles.forEach(article => {
                        // Check if notification has already been shown for this article
                        if (!shownNotifications.has(article.token)) {
                            showNotification(article);
                            shownNotifications.add(article.token); // Add token to the set
                        }
                    });
                }

                return articleList; // Update lastPopUpPostList with the new articleList
            });
        }
        setTimeout(() => {
            fetchData(url);
        }, articleList.length > 0 ? 15000 : 15000);
    };

    const showNotification = (article: Article) => {
        console.log(article);

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
                    data.map((item, index) => (
                        <a target='_blank' href={item.href} key={index} className="card" style={{ color: item.isSuitable ? "green" : "red" }}>
                            <div className="card-image">
                                <img src={item.picture} alt={item.title} />
                            </div>
                            <div className="card-content">
                                <h2 className="card-title">{item.title}</h2>
                                <p className="card-deposit">ودیعه: {formatNumberWithCommas(item.deposit)}</p>
                                <p className="card-rent">اجاره: {formatNumberWithCommas(item.rent)}</p>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
};

export default UrlFetcher;
